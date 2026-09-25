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
  const [error, setError] = useState('');

  /* =========================================================
     LOAD EXISTING TARGETS
  ========================================================= */

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadTargets = async () => {
      setLoading(true);
      setError('');

      const { data, error: loadError } = await supabase
        .from('nutrition_targets')
        .select('calories, protein_g, carbs_g, fat_g')
        .eq('user_id', user.id)
        .maybeSingle();

      if (cancelled) return;

      if (loadError) {
        console.error('NutritionGoals load:', loadError);
        setError('Impossible de charger ton cap nutritionnel.');
        setLoading(false);
        return;
      }

      if (data) {
        if (data.calories != null) {
          setCalories(String(data.calories));
        }

        if (data.protein_g != null) {
          setProtein(String(data.protein_g));
        }

        if (data.carbs_g != null) {
          setCarbs(String(data.carbs_g));
        }

        if (data.fat_g != null) {
          setFat(String(data.fat_g));
        }
      }

      setLoading(false);
    };

    loadTargets();

    return () => {
      cancelled = true;
    };
  }, [user]);

  /* =========================================================
     VALIDATION
  ========================================================= */

  const caloriesNumber = Number(calories);
  const proteinNumber = Number(protein);
  const carbsNumber = Number(carbs);
  const fatNumber = Number(fat);

  const valid =
    calories.trim() !== '' &&
    protein.trim() !== '' &&
    carbs.trim() !== '' &&
    fat.trim() !== '' &&
    Number.isFinite(caloriesNumber) &&
    Number.isFinite(proteinNumber) &&
    Number.isFinite(carbsNumber) &&
    Number.isFinite(fatNumber) &&
    caloriesNumber > 0 &&
    proteinNumber > 0 &&
    carbsNumber >= 0 &&
    fatNumber >= 0;

  /* =========================================================
     SAVE TARGETS
  ========================================================= */

  const saveTargets = async () => {
    if (!user || !valid || saving) return;

    setSaving(true);
    setSaved(false);
    setError('');

    try {
      const payload = {
        user_id: user.id,
        calories: Math.round(caloriesNumber),
        protein_g: Math.round(proteinNumber),
        carbs_g: Math.round(carbsNumber),
        fat_g: Math.round(fatNumber),
      };

      const { error: saveError } = await supabase
        .from('nutrition_targets')
        .upsert(payload, {
          onConflict: 'user_id',
        });

      if (saveError) {
        console.error('NutritionGoals save:', saveError);
        setError(
          saveError.message || 'Impossible d’enregistrer ton cap nutritionnel.'
        );
        return;
      }

      /* =====================================================
         VERIFY DATABASE WRITE
      ===================================================== */

      const { data: verify, error: verifyError } = await supabase
        .from('nutrition_targets')
        .select('calories, protein_g, carbs_g, fat_g')
        .eq('user_id', user.id)
        .maybeSingle();

      if (verifyError) {
        console.error('NutritionGoals verify:', verifyError);
        setError(
          verifyError.message ||
            'Ton cap a été enregistré, mais la vérification a échoué.'
        );
        return;
      }

      if (!verify) {
        setError(
          'Aucun cap nutritionnel n’a été retrouvé après l’enregistrement.'
        );
        return;
      }

      setCalories(String(verify.calories ?? ''));
      setProtein(String(verify.protein_g ?? ''));
      setCarbs(String(verify.carbs_g ?? ''));
      setFat(String(verify.fat_g ?? ''));

      setSaved(true);

      window.setTimeout(() => {
        navigate('/fuel', { replace: true });
      }, 500);
    } catch (err) {
      console.error('NutritionGoals unexpected error:', err);
      setError('Une erreur inattendue est survenue.');
    } finally {
      setSaving(false);
    }
  };

  /* =========================================================
     INPUT STYLE
  ========================================================= */

  const inputStyle = {
    width: '100%',
    height: 72,
    borderRadius: 18,
    border: `1px solid ${BORDER}`,
    background: WHITE,
    padding: '0 54px 0 18px',
    fontSize: 20,
    fontWeight: 850,
    color: BLACK,
    outline: 'none',
    boxSizing: 'border-box' as const,
  };

  /* =========================================================
     FIELD
  ========================================================= */

  const Field = ({
    label,
    hint,
    value,
    onChange,
    unit,
  }: {
    label: string;
    hint?: string;
    value: string;
    onChange: (value: string) => void;
    unit: string;
  }) => (
    <div style={{ marginBottom: 26 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 10,
        }}
      >
        <div
          style={{
            fontSize: 16,
            fontWeight: 900,
            color: BLACK,
          }}
        >
          {label}
        </div>

        {hint && (
          <div
            style={{
              fontSize: 12,
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
          position: 'relative',
        }}
      >
        <input
          type="number"
          inputMode="numeric"
          min="0"
          value={value}
          disabled={loading || saving}
          onChange={(e) => onChange(e.target.value)}
          style={{
            ...inputStyle,
            opacity: loading ? 0.65 : 1,
          }}
        />

        <div
          style={{
            position: 'absolute',
            right: 18,
            top: '50%',
            transform: 'translateY(-50%)',
            color: MUTED,
            fontSize: 14,
            fontWeight: 800,
            pointerEvents: 'none',
          }}
        >
          {unit}
        </div>
      </div>
    </div>
  );

  /* =========================================================
     RENDER
  ========================================================= */

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
          maxWidth: 620,
          margin: '0 auto',
          padding: '24px 18px 48px',
          boxSizing: 'border-box',
        }}
      >
        {/* HEADER */}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            marginBottom: 34,
          }}
        >
          <button
            type="button"
            onClick={() => navigate('/fuel')}
            style={{
              width: 44,
              height: 44,
              borderRadius: 15,
              border: `1px solid ${BORDER}`,
              background: WHITE,
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
            aria-label="Retour à Nutrition"
          >
            <ArrowLeft size={20} strokeWidth={2.4} />
          </button>

          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 900,
                letterSpacing: '0.08em',
                color: MUTED,
                marginBottom: 3,
              }}
            >
              NUTRITION
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: 29,
                lineHeight: 1.05,
                letterSpacing: '-0.045em',
                fontWeight: 950,
              }}
            >
              Ton cap nutritionnel
            </h1>
          </div>
        </div>

        <p
          style={{
            margin: '0 0 32px',
            color: MUTED,
            fontSize: 15,
            lineHeight: 1.55,
          }}
        >
          Ajuste tes objectifs. NOX utilisera ces données pour interpréter ta
          journée et adapter ses recommandations.
        </p>

        {/* LOADING */}

        {loading ? (
          <div
            style={{
              background: WHITE,
              border: `1px solid ${BORDER}`,
              borderRadius: 20,
              padding: 22,
              color: MUTED,
              fontSize: 14,
              marginBottom: 22,
            }}
          >
            Chargement de ton cap...
          </div>
        ) : (
          <>
            {/* FIELDS */}

            <Field
              label="Calories"
              hint="objectif journalier"
              value={calories}
              onChange={setCalories}
              unit="kcal"
            />

            <Field
              label="Protéines"
              hint="priorité transformation"
              value={protein}
              onChange={setProtein}
              unit="g"
            />

            <Field
              label="Glucides"
              value={carbs}
              onChange={setCarbs}
              unit="g"
            />

            <Field
              label="Lipides"
              value={fat}
              onChange={setFat}
              unit="g"
            />

            {/* INFO */}

            <div
              style={{
                borderRadius: 18,
                background: '#EEFFD0',
                border: `1px solid ${ACCENT}`,
                padding: '15px 17px',
                color: '#53651B',
                fontSize: 13,
                lineHeight: 1.5,
                marginTop: 4,
                marginBottom: 20,
              }}
            >
              Ces valeurs servent de cap à NOX pour interpréter ta journée et
              adapter ses recommandations.
            </div>

            {/* ERROR */}

            {error && (
              <div
                style={{
                  borderRadius: 18,
                  background: '#FFF0ED',
                  border: '1px solid #FFD2CA',
                  padding: '15px 17px',
                  color: '#C43D2F',
                  fontSize: 13,
                  lineHeight: 1.5,
                  marginBottom: 18,
                  wordBreak: 'break-word',
                }}
              >
                {error}
              </div>
            )}

            {/* SUCCESS */}

            {saved && (
              <div
                style={{
                  borderRadius: 18,
                  background: '#F1FFD9',
                  border: `1px solid ${ACCENT}`,
                  padding: '15px 17px',
                  color: '#53651B',
                  fontSize: 13,
                  fontWeight: 800,
                  marginBottom: 18,
                }}
              >
                Cap enregistré ✓ Retour vers Nutrition...
              </div>
            )}

            {/* SAVE */}

            <button
              type="button"
              disabled={!valid || saving}
              onClick={saveTargets}
              style={{
                width: '100%',
                minHeight: 58,
                border: 0,
                borderRadius: 18,
                background: valid && !saving ? BLACK : '#DADDD5',
                color: valid && !saving ? WHITE : '#92978E',
                fontSize: 14,
                fontWeight: 950,
                letterSpacing: '0.025em',
                cursor: valid && !saving ? 'pointer' : 'not-allowed',
                transition: '150ms ease',
              }}
            >
              {saving
                ? 'ENREGISTREMENT...'
                : saved
                  ? 'ENREGISTRÉ ✓'
                  : 'ENREGISTRER MON CAP'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
