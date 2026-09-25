import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { BottomNav } from './Home';
import { ArrowLeft, ChevronDown, ChevronRight, ChevronUp, UserRound } from 'lucide-react';

const BG = '#F7F8F4';
const WHITE = '#FFFFFF';
const BLACK = '#0B0B0B';
const MUTED = '#7A7F76';
const BORDER = '#E8EAE4';
const ACCENT = '#C8FF00';

type Profile = {
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  date_of_birth: string | null;
  sex: string | null;
  height_cm: number | null;
  starting_weight_kg: number | null;
  activity_level: string | null;
  goal_type: string | null;
  subscription_plan: string | null;
};

type PersonalForm = {
  date_of_birth: string;
  sex: string;
  height_cm: string;
  starting_weight_kg: string;
};

const normalizeSex = (value?: string | null) => {
  const v = (value || '').toLowerCase().trim();
  if (['homme', 'male', 'masculin', 'man'].includes(v)) return 'homme';
  if (['femme', 'female', 'feminin', 'féminin', 'woman'].includes(v)) return 'femme';
  return v;
};

export default function Settings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const fromNutrition =
    new URLSearchParams(location.search).get('edit') === 'personal';

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [personalOpen, setPersonalOpen] = useState(fromNutrition);
  const [savingPersonal, setSavingPersonal] = useState(false);
  const [personalSaved, setPersonalSaved] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState<PersonalForm>({
    date_of_birth: '',
    sex: '',
    height_cm: '',
    starting_weight_kg: '',
  });

  useEffect(() => {
    if (fromNutrition) setPersonalOpen(true);
  }, [fromNutrition]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadProfile = async () => {
      setLoading(true);
      setError('');

      const { data, error: profileError } = await supabase
        .from('profiles')
        .select(`
          display_name,
          email,
          avatar_url,
          date_of_birth,
          sex,
          height_cm,
          starting_weight_kg,
          activity_level,
          goal_type,
          subscription_plan
        `)
        .eq('id', user.id)
        .maybeSingle();

      if (cancelled) return;

      if (profileError) {
        console.error('Settings profile:', profileError);
        setError('Impossible de charger ton profil.');
        setLoading(false);
        return;
      }

      const loaded = (data as Profile | null) || null;
      setProfile(loaded);

      setForm({
        date_of_birth: loaded?.date_of_birth || '',
        sex: normalizeSex(loaded?.sex),
        height_cm:
          loaded?.height_cm != null ? String(loaded.height_cm) : '',
        starting_weight_kg:
          loaded?.starting_weight_kg != null
            ? String(loaded.starting_weight_kg)
            : '',
      });

      setLoading(false);
    };

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const savePersonalInformation = async () => {
    if (!user || savingPersonal) return;

    const height = Number(form.height_cm);
    const weight = Number(form.starting_weight_kg);

    if (
      !form.date_of_birth ||
      !form.sex ||
      !Number.isFinite(height) ||
      height <= 0 ||
      !Number.isFinite(weight) ||
      weight <= 0
    ) {
      setError('Complète la date de naissance, le sexe, la taille et le poids.');
      return;
    }

    setSavingPersonal(true);
    setPersonalSaved(false);
    setError('');

    const payload = {
      date_of_birth: form.date_of_birth,
      sex: form.sex,
      height_cm: height,
      starting_weight_kg: weight,
      updated_at: new Date().toISOString(),
    };

    const { error: updateError } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', user.id);

    if (updateError) {
      console.error('Settings personal save:', updateError);
      setError(
        updateError.message ||
          'Impossible d’enregistrer tes informations personnelles.'
      );
      setSavingPersonal(false);
      return;
    }

    const { data: verify, error: verifyError } = await supabase
      .from('profiles')
      .select('date_of_birth, sex, height_cm, starting_weight_kg')
      .eq('id', user.id)
      .maybeSingle();

    if (verifyError || !verify) {
      console.error('Settings personal verify:', verifyError);
      setError(
        verifyError?.message ||
          'Les informations ont été enregistrées, mais la vérification a échoué.'
      );
      setSavingPersonal(false);
      return;
    }

    setProfile((current) =>
      current
        ? {
            ...current,
            date_of_birth: verify.date_of_birth,
            sex: verify.sex,
            height_cm: verify.height_cm,
            starting_weight_kg: verify.starting_weight_kg,
          }
        : current
    );

    setPersonalSaved(true);
    setSavingPersonal(false);
  };

  const fieldStyle = {
    width: '100%',
    minHeight: 54,
    borderRadius: 15,
    border: `1px solid ${BORDER}`,
    background: WHITE,
    padding: '0 15px',
    color: BLACK,
    fontSize: 16,
    fontWeight: 750,
    outline: 'none',
    boxSizing: 'border-box' as const,
  };

  const Row = ({
    title,
    subtitle,
    onClick,
  }: {
    title: string;
    subtitle?: string;
    onClick?: () => void;
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      style={{
        width: '100%',
        border: 0,
        borderBottom: `1px solid ${BORDER}`,
        background: 'transparent',
        padding: '17px 0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        textAlign: 'left',
        cursor: onClick ? 'pointer' : 'default',
        color: BLACK,
      }}
    >
      <div>
        <div style={{ fontSize: 15, fontWeight: 900 }}>{title}</div>
        {subtitle && (
          <div
            style={{
              color: MUTED,
              fontSize: 12,
              lineHeight: 1.4,
              marginTop: 3,
            }}
          >
            {subtitle}
          </div>
        )}
      </div>
      {onClick && <ChevronRight size={18} color={MUTED} />}
    </button>
  );

  return (
    <div
      style={{
        minHeight: '100vh',
        background: BG,
        color: BLACK,
        paddingBottom: 110,
      }}
    >
      <main
        style={{
          width: '100%',
          maxWidth: 620,
          margin: '0 auto',
          padding: '24px 18px 40px',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            marginBottom: 26,
          }}
        >
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Retour"
            style={{
              width: 44,
              height: 44,
              borderRadius: 15,
              border: `1px solid ${BORDER}`,
              background: WHITE,
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
            }}
          >
            <ArrowLeft size={20} />
          </button>

          <div>
            <div
              style={{
                color: MUTED,
                fontSize: 12,
                fontWeight: 900,
                letterSpacing: '0.08em',
              }}
            >
              NOX
            </div>
            <h1
              style={{
                margin: '2px 0 0',
                fontSize: 30,
                fontWeight: 950,
                letterSpacing: '-0.045em',
              }}
            >
              Moi
            </h1>
          </div>
        </div>

        <section
          style={{
            background: WHITE,
            border: `1px solid ${BORDER}`,
            borderRadius: 24,
            padding: 20,
            marginBottom: 14,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 54,
                height: 54,
                borderRadius: 18,
                background: ACCENT,
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
              }}
            >
              <UserRound size={24} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 950,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {profile?.display_name || 'Mon profil'}
              </div>
              <div
                style={{
                  color: MUTED,
                  fontSize: 12,
                  marginTop: 3,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {profile?.email || user?.email || ''}
              </div>
            </div>
          </div>
        </section>

        <section
          id="personal-information"
          style={{
            background: WHITE,
            border: `1px solid ${BORDER}`,
            borderRadius: 24,
            padding: '0 18px',
            marginBottom: 14,
          }}
        >
          <button
            type="button"
            onClick={() => setPersonalOpen((v) => !v)}
            style={{
              width: '100%',
              minHeight: 66,
              border: 0,
              background: 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 14,
              cursor: 'pointer',
              color: BLACK,
              padding: 0,
            }}
          >
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 16, fontWeight: 950 }}>
                Mes informations
              </div>
              <div style={{ color: MUTED, fontSize: 12, marginTop: 3 }}>
                Date de naissance, sexe, taille et poids
              </div>
            </div>
            {personalOpen ? (
              <ChevronUp size={19} />
            ) : (
              <ChevronDown size={19} />
            )}
          </button>

          {personalOpen && (
            <div
              style={{
                borderTop: `1px solid ${BORDER}`,
                padding: '18px 0 20px',
              }}
            >
              {loading ? (
                <div style={{ color: MUTED, fontSize: 13 }}>
                  Chargement de ton profil...
                </div>
              ) : (
                <>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 12,
                      fontWeight: 900,
                      marginBottom: 7,
                    }}
                  >
                    DATE DE NAISSANCE
                  </label>
                  <input
                    type="date"
                    value={form.date_of_birth}
                    onChange={(e) =>
                      setForm((v) => ({
                        ...v,
                        date_of_birth: e.target.value,
                      }))
                    }
                    style={{ ...fieldStyle, marginBottom: 16 }}
                  />

                  <label
                    style={{
                      display: 'block',
                      fontSize: 12,
                      fontWeight: 900,
                      marginBottom: 7,
                    }}
                  >
                    SEXE
                  </label>
                  <select
                    value={form.sex}
                    onChange={(e) =>
                      setForm((v) => ({ ...v, sex: e.target.value }))
                    }
                    style={{ ...fieldStyle, marginBottom: 16 }}
                  >
                    <option value="">Choisir</option>
                    <option value="homme">Homme</option>
                    <option value="femme">Femme</option>
                  </select>

                  <label
                    style={{
                      display: 'block',
                      fontSize: 12,
                      fontWeight: 900,
                      marginBottom: 7,
                    }}
                  >
                    TAILLE
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="100"
                    max="250"
                    placeholder="Ex. 178"
                    value={form.height_cm}
                    onChange={(e) =>
                      setForm((v) => ({
                        ...v,
                        height_cm: e.target.value,
                      }))
                    }
                    style={{ ...fieldStyle, marginBottom: 16 }}
                  />

                  <label
                    style={{
                      display: 'block',
                      fontSize: 12,
                      fontWeight: 900,
                      marginBottom: 7,
                    }}
                  >
                    POIDS
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="30"
                    max="350"
                    step="0.1"
                    placeholder="Ex. 78"
                    value={form.starting_weight_kg}
                    onChange={(e) =>
                      setForm((v) => ({
                        ...v,
                        starting_weight_kg: e.target.value,
                      }))
                    }
                    style={{ ...fieldStyle, marginBottom: 18 }}
                  />

                  <button
                    type="button"
                    onClick={savePersonalInformation}
                    disabled={savingPersonal}
                    style={{
                      width: '100%',
                      minHeight: 56,
                      border: 0,
                      borderRadius: 17,
                      background: BLACK,
                      color: WHITE,
                      fontSize: 13,
                      fontWeight: 950,
                      cursor: savingPersonal ? 'wait' : 'pointer',
                      opacity: savingPersonal ? 0.7 : 1,
                    }}
                  >
                    {savingPersonal
                      ? 'ENREGISTREMENT...'
                      : 'ENREGISTRER MES INFORMATIONS'}
                  </button>

                  {personalSaved && (
                    <div
                      style={{
                        marginTop: 12,
                        borderRadius: 15,
                        background: '#F1FFD9',
                        border: `1px solid ${ACCENT}`,
                        padding: 13,
                        fontSize: 12,
                        fontWeight: 850,
                      }}
                    >
                      Informations enregistrées ✓
                    </div>
                  )}

                  {fromNutrition && personalSaved && (
                    <button
                      type="button"
                      onClick={() => navigate('/nutrition-goals')}
                      style={{
                        width: '100%',
                        minHeight: 54,
                        marginTop: 10,
                        borderRadius: 17,
                        border: `1px solid ${BLACK}`,
                        background: ACCENT,
                        color: BLACK,
                        fontSize: 12,
                        fontWeight: 950,
                        cursor: 'pointer',
                      }}
                    >
                      RETOURNER AU CAP NUTRITIONNEL
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </section>

        {error && (
          <div
            style={{
              borderRadius: 18,
              background: '#FFF0ED',
              border: '1px solid #FFD2CA',
              padding: '14px 16px',
              color: '#C43D2F',
              fontSize: 13,
              lineHeight: 1.5,
              marginBottom: 14,
            }}
          >
            {error}
          </div>
        )}

        <section
          style={{
            background: WHITE,
            border: `1px solid ${BORDER}`,
            borderRadius: 24,
            padding: '0 18px',
            marginBottom: 14,
          }}
        >
          <div
            style={{
              paddingTop: 17,
              color: MUTED,
              fontSize: 11,
              fontWeight: 950,
              letterSpacing: '0.07em',
            }}
          >
            TA DIRECTION
          </div>
          <Row
            title="Nutrition"
            subtitle="Cap calorique et macronutriments"
            onClick={() => navigate('/nutrition-goals')}
          />
          <Row
            title="Training"
            subtitle="Programme et préférences d’entraînement"
            onClick={() => navigate('/training')}
          />
          <Row
            title="Recovery"
            subtitle="Sommeil, récupération et habitudes"
            onClick={() => navigate('/recovery')}
          />
        </section>

        <section
          style={{
            background: WHITE,
            border: `1px solid ${BORDER}`,
            borderRadius: 24,
            padding: '0 18px',
          }}
        >
          <div
            style={{
              paddingTop: 17,
              color: MUTED,
              fontSize: 11,
              fontWeight: 950,
              letterSpacing: '0.07em',
            }}
          >
            COMPTE
          </div>
          <Row
            title="Abonnement"
            subtitle={profile?.subscription_plan || 'free'}
            onClick={() => navigate('/subscribe')}
          />
          <Row
            title="Paramètres"
            subtitle="Préférences générales NOX"
            onClick={() => navigate('/settings')}
          />
        </section>
      </main>

      <BottomNav active="moi" />
    </div>
  );
}
