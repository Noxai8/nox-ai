import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { ArrowLeft } from 'lucide-react';

const BG = '#F7F8F4';
const WHITE = '#FFFFFF';
const BLACK = '#0B0B0B';
const MUTED = '#7A7F76';
const BORDER = '#E8EAE4';
const ACCENT = '#C8FF00';

export default function NutritionGoals() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadTargets = async () => {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('nutrition_targets')
        .select('calories, protein, carbs, fat')
        .eq('user_id', user.id)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error('NutritionGoals load:', error);
        setError(
          "Impossible de charger ton cap nutritionnel."
        );
        setLoading(false);
        return;
      }

      if (data) {
        setCalories(
          data.calories != null
            ? String(data.calories)
            : ''
        );

        setProtein(
          data.protein != null
            ? String(data.protein)
            : ''
        );

        setCarbs(
          data.carbs != null
            ? String(data.carbs)
            : ''
        );

        setFat(
          data.fat != null
            ? String(data.fat)
            : ''
        );
      }

      setLoading(false);
    };

    loadTargets();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const calorieValue = Number(calories);
  const proteinValue = Number(protein);
  const carbsValue = Number(carbs);
  const fatValue = Number(fat);

  const valid =
    Number.isFinite(calorieValue) &&
    Number.isFinite(proteinValue) &&
    Number.isFinite(carbsValue) &&
    Number.isFinite(fatValue) &&
    calorieValue > 0 &&
    proteinValue > 0 &&
    carbsValue >= 0 &&
    fatValue >= 0;

  const saveTargets = async () => {
    if (!user || !valid || saving) return;

    setSaving(true);
    setSaved(false);
    setError(null);

    const payload = {
      user_id: user.id,
      calories: calorieValue,
      protein: proteinValue,
      carbs: carbsValue,
      fat: fatValue,
    };

    const { error } = await supabase
      .from('nutrition_targets')
      .upsert(payload, {
        onConflict: 'user_id',
      });

    if (error) {
      console.error(
        'NutritionGoals save:',
        error
      );

      setError(
        "Impossible d'enregistrer ton cap. Réessaie."
      );

      setSaving(false);
      return;
    }

    // Vérification : on relit réellement la ligne
    // enregistrée avant de retourner dans Fuel.
    const {
      data: verified,
      error: verifyError,
    } = await supabase
      .from('nutrition_targets')
      .select(
        'calories, protein, carbs, fat'
      )
      .eq('user_id', user.id)
      .maybeSingle();

    if (
      verifyError ||
      !verified ||
      verified.calories == null ||
      verified.protein == null
    ) {
      console.error(
        'NutritionGoals verify:',
        verifyError
      );

      setError(
        "Le cap n'a pas pu être vérifié après l'enregistrement."
      );

      setSaving(false);
      return;
    }

    setSaving(false);
    setSaved(true);

    setTimeout(() => {
      navigate('/fuel', {
        replace: true,
      });
    }, 500);
  };

  const Field = ({
    label,
    value,
    setValue,
    unit,
    hint,
  }: {
    label: string;
    value: string;
    setValue: (value: string) => void;
    unit: string;
    hint?: string;
  }) => (
    <div
      style={{
        marginBottom: 20,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 10,
          gap: 12,
        }}
      >
        <div
          style={{
            fontSize: 15,
            fontWeight: 800,
            color: BLACK,
          }}
        >
          {label}
        </div>

        {hint && (
          <div
            style={{
              fontSize: 11,
              color: MUTED,
              textAlign: 'right',
            }}
          >
            {hint}
          </div>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          background: WHITE,
          border: `1px solid ${BORDER}`,
          borderRadius: 16,
          overflow: 'hidden',
        }}
      >
        <input
          type="number"
          min="0"
          step="1"
          value={value}
          onChange={event => {
            setSaved(false);
            setError(null);
            setValue(event.target.value);
          }}
          inputMode="numeric"
          style={{
            flex: 1,
            minWidth: 0,
            padding: '16px 18px',
            border: 'none',
            outline: 'none',
            fontSize: 24,
            fontWeight: 950,
            color: BLACK,
            background: 'transparent',
          }}
        />

        <div
          style={{
            padding: '0 18px',
            fontSize: 14,
            color: MUTED,
            fontWeight: 700,
          }}
        >
          {unit}
        </div>
      </div>
    </div>
  );

  return (
    <div
      style={{
        minHeight: '100vh',
        background: BG,
        color: BLACK,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 560,
          margin: '0 auto',
        }}
      >
        <header
          style={{
            padding: '20px 20px 0',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            marginBottom: 28,
          }}
        >
          <button
            onClick={() => navigate(-1)}
            aria-label="Retour"
            style={{
              width: 40,
              height: 40,
              borderRadius: 14,
              border: `1px solid ${BORDER}`,
              background: WHITE,
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <ArrowLeft size={18} />
          </button>

          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 900,
                color: MUTED,
                letterSpacing: '.12em',
              }}
            >
              NUTRITION
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: 26,
                fontWeight: 950,
                letterSpacing: '-.04em',
              }}
            >
              Ton cap nutritionnel
            </h1>
          </div>
        </header>

        <main
          style={{
            padding: '0 20px 40px',
          }}
        >
          <p
            style={{
              margin: '0 0 28px',
              fontSize: 14,
              color: MUTED,
              lineHeight: 1.6,
            }}
          >
            Ajuste tes objectifs. NOX utilisera ces
            données pour interpréter ta journée et
            adapter ses recommandations.
          </p>

          {loading ? (
            <div
              style={{
                padding: '40px 0',
                textAlign: 'center',
                color: MUTED,
                fontSize: 13,
              }}
            >
              Chargement de ton cap...
            </div>
          ) : (
            <>
              <Field
                label="Calories"
                value={calories}
                setValue={setCalories}
                unit="kcal"
                hint="objectif journalier"
              />

              <Field
                label="Protéines"
                value={protein}
                setValue={setProtein}
                unit="g"
                hint="priorité transformation"
              />

              <Field
                label="Glucides"
                value={carbs}
                setValue={setCarbs}
                unit="g"
              />

              <Field
                label="Lipides"
                value={fat}
                setValue={setFat}
                unit="g"
              />

              <div
                style={{
                  background: '#F0FFD0',
                  border:
                    '1px solid #DDF59C',
                  borderRadius: 16,
                  padding: '12px 16px',
                  marginBottom: 20,
                  fontSize: 12,
                  color: '#456000',
                  lineHeight: 1.6,
                }}
              >
                Ces valeurs servent de cap à NOX
                pour interpréter ta journée et
                adapter ses recommandations.
              </div>

              {error && (
                <div
                  style={{
                    background:
                      'rgba(255, 70, 70, .08)',
                    border:
                      '1px solid rgba(255, 70, 70, .18)',
                    color: '#B42318',
                    borderRadius: 14,
                    padding: '12px 14px',
                    marginBottom: 16,
                    fontSize: 12,
                    lineHeight: 1.5,
                  }}
                >
                  {error}
                </div>
              )}

              <button
                onClick={saveTargets}
                disabled={!valid || saving}
                style={{
                  width: '100%',
                  padding: 18,
                  border: 0,
                  borderRadius: 18,

                  background: saved
                    ? '#69B578'
                    : valid
                      ? BLACK
                      : '#E8EAE4',

                  color: saved
                    ? WHITE
                    : valid
                      ? ACCENT
                      : MUTED,

                  fontWeight: 950,
                  fontSize: 15,

                  cursor:
                    valid && !saving
                      ? 'pointer'
                      : 'not-allowed',

                  opacity: saving ? 0.7 : 1,

                  transition:
                    'background .2s',
                }}
              >
                {saved
                  ? 'ENREGISTRÉ'
                  : saving
                    ? 'ENREGISTREMENT...'
                    : 'ENREGISTRER'}
              </button>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
