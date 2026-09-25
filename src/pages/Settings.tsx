import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { BottomNav } from './Home';
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  UserRound,
} from 'lucide-react';

const ACCENT = '#C8FF00';
const BG = '#F7F8F4';
const WHITE = '#FFFFFF';
const BLACK = '#0B0B0B';
const MUTED = '#7A7F76';
const BORDER = '#E8EAE4';

const XP_LEVELS = [
  { level: 1, name: 'Débutant', min: 0 },
  { level: 2, name: 'Régulier', min: 200 },
  { level: 3, name: 'Confirmé', min: 500 },
  { level: 4, name: 'Performant', min: 1000 },
  { level: 5, name: 'Expert', min: 2000 },
  { level: 6, name: 'Élite NOX', min: 4000 },
];

function getLevel(xp: number) {
  let current = XP_LEVELS[0];

  for (const l of XP_LEVELS) {
    if (xp >= l.min) current = l;
  }

  const idx = XP_LEVELS.indexOf(current);
  const next = XP_LEVELS[idx + 1];

  const pct = next
    ? Math.round(
        ((xp - current.min) /
          (next.min - current.min)) *
          100
      )
    : 100;

  return {
    ...current,
    next,
    pct,
  };
}

const GOAL_LABELS: Record<string, string> = {
  perdre_gras: 'Perte de gras',
  prendre_muscle: 'Prise de muscle',
  prise_muscle: 'Prise de muscle',
  recomposition: 'Recomposition',
  force: 'Gain de force',
  performance: 'Performance',
  maintien: 'Maintien',
};

type PersonalForm = {
  date_of_birth: string;
  sex: string;
  height_cm: string;
  starting_weight_kg: string;
};

export default function Settings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [profile, setProfile] = useState<any>(null);

  const [stats, setStats] = useState({
    workouts: 0,
    prs: 0,
    streak: 0,
  });

  const [editName, setEditName] = useState(false);
  const [displayName, setDisplayName] = useState('');

  const [editPersonal, setEditPersonal] = useState(false);

  const [personal, setPersonal] =
    useState<PersonalForm>({
      date_of_birth: '',
      sex: '',
      height_cm: '',
      starting_weight_kg: '',
    });

  const [saving, setSaving] = useState(false);
  const [savingPersonal, setSavingPersonal] =
    useState(false);

  const [personalSaved, setPersonalSaved] =
    useState(false);

  const [personalError, setPersonalError] =
    useState('');

  const [exporting, setExporting] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [showPrivacy, setShowPrivacy] = useState(false);

  /*
   * Si on arrive depuis Nutrition avec :
   * /profile?edit=personal
   * l'éditeur s'ouvre automatiquement.
   */
  const fromNutrition =
    new URLSearchParams(location.search).get('edit') ===
    'personal';

  useEffect(() => {
    if (user) {
      load();
    }
  }, [user]);

  useEffect(() => {
    if (fromNutrition) {
      setEditPersonal(true);
    }
  }, [fromNutrition]);

  const load = async () => {
    if (!user) return;

    const [
      { data: prof, error: profileError },
      { data: wkts },
      { data: prs },
    ] = await Promise.all([
      supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle(),

      supabase
        .from('workouts')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'completed'),

      supabase
        .from('personal_records')
        .select('id')
        .eq('user_id', user.id),
    ]);

    if (profileError) {
      console.error(
        'Settings profile:',
        profileError
      );
      return;
    }

    setProfile(prof);

    setDisplayName(
      prof?.display_name ||
        prof?.first_name ||
        ''
    );

    setPersonal({
      date_of_birth: prof?.date_of_birth || '',
      sex: prof?.sex || '',
      height_cm:
        prof?.height_cm != null
          ? String(prof.height_cm)
          : '',
      starting_weight_kg:
        prof?.starting_weight_kg != null
          ? String(prof.starting_weight_kg)
          : '',
    });

    setStats({
      workouts: (wkts || []).length,
      prs: (prs || []).length,
      streak: prof?.streak_days || 0,
    });
  };

  /* =========================================================
     NAME
  ========================================================= */

  const saveName = async () => {
    if (!user || saving) return;

    setSaving(true);

    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: displayName.trim(),
      })
      .eq('id', user.id);

    if (error) {
      console.error(
        'Settings saveName:',
        error
      );
      setSaving(false);
      return;
    }

    setSaving(false);
    setEditName(false);

    await load();
  };

  /* =========================================================
     PERSONAL INFORMATION
  ========================================================= */

  const savePersonalInformation = async () => {
    if (!user || savingPersonal) return;

    setPersonalError('');
    setPersonalSaved(false);

    const height = Number(personal.height_cm);
    const weight = Number(
      personal.starting_weight_kg
    );

    if (!personal.date_of_birth) {
      setPersonalError(
        'Renseigne ta date de naissance.'
      );
      return;
    }

    if (!personal.sex) {
      setPersonalError(
        'Renseigne le sexe utilisé pour le calcul énergétique.'
      );
      return;
    }

    if (
      !Number.isFinite(height) ||
      height <= 0
    ) {
      setPersonalError(
        'Renseigne une taille valide.'
      );
      return;
    }

    if (
      !Number.isFinite(weight) ||
      weight <= 0
    ) {
      setPersonalError(
        'Renseigne un poids valide.'
      );
      return;
    }

    setSavingPersonal(true);

    try {
      const payload = {
        date_of_birth: personal.date_of_birth,
        sex: personal.sex,
        height_cm: height,
        starting_weight_kg: weight,
      };

      const { data, error } = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', user.id)
        .select(
          'date_of_birth, sex, height_cm, starting_weight_kg'
        )
        .maybeSingle();

      if (error) {
        console.error(
          'Settings personal:',
          error
        );

        setPersonalError(
          error.message ||
            'Impossible d’enregistrer tes informations.'
        );

        return;
      }

      if (!data) {
        setPersonalError(
          'Les informations n’ont pas pu être vérifiées après l’enregistrement.'
        );
        return;
      }

      /*
       * Mise à jour locale immédiate.
       */
      setProfile((current: any) => ({
        ...(current || {}),
        ...data,
      }));

      setPersonal({
        date_of_birth: data.date_of_birth || '',
        sex: data.sex || '',
        height_cm:
          data.height_cm != null
            ? String(data.height_cm)
            : '',
        starting_weight_kg:
          data.starting_weight_kg != null
            ? String(data.starting_weight_kg)
            : '',
      });

      setPersonalSaved(true);
      setEditPersonal(false);
    } catch (err) {
      console.error(
        'Settings unexpected personal save:',
        err
      );

      setPersonalError(
        'Une erreur inattendue est survenue.'
      );
    } finally {
      setSavingPersonal(false);
    }
  };

  /* =========================================================
     EXPORT
  ========================================================= */

  const exportData = async () => {
    if (!user) return;

    setExporting(true);

    const [
      { data: prof },
      { data: wkts },
      { data: food },
      { data: body },
      { data: prs },
    ] = await Promise.all([
      supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle(),

      supabase
        .from('workouts')
        .select('*')
        .eq('user_id', user.id),

      supabase
        .from('food_entries')
        .select('*')
        .eq('user_id', user.id),

      supabase
        .from('body_logs')
        .select('*')
        .eq('user_id', user.id),

      supabase
        .from('personal_records')
        .select('*')
        .eq('user_id', user.id),
    ]);

    const blob = new Blob(
      [
        JSON.stringify(
          {
            exported_at: new Date().toISOString(),
            profile: prof,
            workouts: wkts,
            food_entries: food,
            body_logs: body,
            personal_records: prs,
          },
          null,
          2
        ),
      ],
      {
        type: 'application/json',
      }
    );

    const url =
      URL.createObjectURL(blob);

    const a =
      document.createElement('a');

    a.href = url;
    a.download = `nox-export-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;

    a.click();

    URL.revokeObjectURL(url);
    setExporting(false);
  };

  /* =========================================================
     DELETE ACCOUNT
  ========================================================= */

  const deleteAccount = async () => {
    if (
      !user ||
      deleteInput !== 'SUPPRIMER'
    ) {
      return;
    }

    await Promise.all([
      supabase
        .from('food_entries')
        .delete()
        .eq('user_id', user.id),

      supabase
        .from('workouts')
        .delete()
        .eq('user_id', user.id),

      supabase
        .from('workout_sets')
        .delete()
        .eq('user_id', user.id),

      supabase
        .from('body_logs')
        .delete()
        .eq('user_id', user.id),

      supabase
        .from('personal_records')
        .delete()
        .eq('user_id', user.id),

      supabase
        .from('profiles')
        .delete()
        .eq('id', user.id),
    ]);

    await supabase.auth.signOut();

    navigate('/');
  };

  /* =========================================================
     DERIVED DATA
  ========================================================= */

  const xp = profile?.xp || 0;
  const level = getLevel(xp);

  const goalLabel =
    GOAL_LABELS[profile?.goal_type] ||
    profile?.goal_type ||
    'Transformation';

  const profileComplete =
    Boolean(profile?.date_of_birth) &&
    Boolean(profile?.sex) &&
    Number(profile?.height_cm) > 0 &&
    Number(profile?.starting_weight_kg) > 0;

  const personalSummary = profileComplete
    ? `${profile.height_cm} cm · ${profile.starting_weight_kg} kg`
    : 'À compléter';

  /* =========================================================
     UI HELPERS
  ========================================================= */

  const Row = ({
    label,
    value,
    onClick,
    danger = false,
  }: {
    label: string;
    value?: string;
    onClick?: () => void;
    danger?: boolean;
  }) => (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
        padding: '16px 0',
        background: 'none',
        border: 'none',
        borderBottom: `1px solid ${BORDER}`,
        cursor: onClick ? 'pointer' : 'default',
        textAlign: 'left',
      }}
    >
      <span
        style={{
          fontSize: 15,
          fontWeight: 600,
          color: danger
            ? '#FF5C5C'
            : BLACK,
        }}
      >
        {label}
      </span>

      {value ? (
        <span
          style={{
            fontSize: 13,
            color:
              value === 'À compléter'
                ? '#A16400'
                : MUTED,
            maxWidth: 190,
            textAlign: 'right',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontWeight:
              value === 'À compléter'
                ? 850
                : 500,
          }}
        >
          {value}
        </span>
      ) : onClick ? (
        <ChevronRight
          size={16}
          color={MUTED}
        />
      ) : null}
    </button>
  );

  const Section = ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <div
      style={{
        marginBottom: 28,
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 900,
          color: MUTED,
          letterSpacing: '.12em',
          marginBottom: 12,
        }}
      >
        {title}
      </div>

      <div
        style={{
          background: WHITE,
          borderRadius: 20,
          padding: '0 18px',
          border: `1px solid ${BORDER}`,
        }}
      >
        {children}
      </div>
    </div>
  );

  const fieldStyle = {
    width: '100%',
    height: 54,
    borderRadius: 14,
    border: `1px solid ${BORDER}`,
    background: BG,
    color: BLACK,
    fontSize: 16,
    fontWeight: 700,
    outline: 'none',
    padding: '0 14px',
    boxSizing: 'border-box' as const,
  };

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div
      style={{
        minHeight: '100vh',
        background: BG,
        color: BLACK,
        paddingBottom: 110,
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
            padding: '22px 20px 0',
            marginBottom: 28,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 900,
              color: MUTED,
              letterSpacing: '.12em',
              marginBottom: 6,
            }}
          >
            MOI
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: 36,
              fontWeight: 950,
              letterSpacing: '-.05em',
              lineHeight: 0.95,
            }}
          >
            TOI.
          </h1>
        </header>

        <main
          style={{
            padding: '0 20px',
          }}
        >
          {/* =====================================================
              PROFILE HERO
          ===================================================== */}

          <div
            style={{
              background: BLACK,
              borderRadius: 24,
              padding: 22,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: 18,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 900,
                    color: MUTED,
                    letterSpacing: '.1em',
                    marginBottom: 6,
                  }}
                >
                  TON IDENTITÉ
                </div>

                {editName ? (
                  <div
                    style={{
                      display: 'flex',
                      gap: 8,
                      alignItems: 'center',
                    }}
                  >
                    <input
                      value={displayName}
                      onChange={(e) =>
                        setDisplayName(
                          e.target.value
                        )
                      }
                      style={{
                        background: '#1a1a1a',
                        border: '1px solid #333',
                        borderRadius: 10,
                        padding: '8px 12px',
                        color: WHITE,
                        fontSize: 20,
                        fontWeight: 950,
                        outline: 'none',
                        width: 160,
                      }}
                    />

                    <button
                      type="button"
                      onClick={saveName}
                      style={{
                        padding: '8px 14px',
                        background: ACCENT,
                        border: 0,
                        borderRadius: 10,
                        color: BLACK,
                        fontWeight: 900,
                        fontSize: 12,
                        cursor: 'pointer',
                      }}
                    >
                      {saving ? '...' : 'OK'}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      setEditName(true)
                    }
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 26,
                        fontWeight: 950,
                        color: WHITE,
                        letterSpacing: '-.03em',
                      }}
                    >
                      {profile?.display_name ||
                        profile?.first_name ||
                        'Mon profil'}
                    </div>
                  </button>
                )}

                <div
                  style={{
                    fontSize: 13,
                    color: MUTED,
                    marginTop: 4,
                  }}
                >
                  {user?.email}
                </div>
              </div>

              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 18,
                  background: ACCENT,
                  display: 'grid',
                  placeItems: 'center',
                  fontWeight: 950,
                  fontSize: 22,
                  color: BLACK,
                  flexShrink: 0,
                }}
              >
                {(
                  profile?.display_name ||
                  profile?.first_name ||
                  'N'
                )[0].toUpperCase()}
              </div>
            </div>

            {/* STATS */}

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(3,1fr)',
                gap: 10,
                marginBottom: 18,
              }}
            >
              {[
                {
                  label: 'SÉANCES',
                  v: stats.workouts,
                },
                {
                  label: 'RECORDS',
                  v: stats.prs,
                },
                {
                  label: 'STREAK',
                  v: `${stats.streak}j`,
                },
              ].map(({ label, v }) => (
                <div
                  key={label}
                  style={{
                    background: '#1a1a1a',
                    borderRadius: 14,
                    padding: '12px 0',
                    textAlign: 'center',
                  }}
                >
                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 950,
                      color: WHITE,
                    }}
                  >
                    {v}
                  </div>

                  <div
                    style={{
                      fontSize: 8,
                      color: MUTED,
                      fontWeight: 700,
                      marginTop: 2,
                    }}
                  >
                    {label}
                  </div>
                </div>
              ))}
            </div>

            {/* XP */}

            <div
              style={{
                background: '#1a1a1a',
                borderRadius: 16,
                padding: '14px 16px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 8,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 10,
                      color: MUTED,
                      fontWeight: 700,
                    }}
                  >
                    NIV. {level.level} —{' '}
                    {level.name.toUpperCase()}
                  </div>

                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 950,
                      color: WHITE,
                      marginTop: 2,
                    }}
                  >
                    {xp} XP
                  </div>
                </div>

                {level.next && (
                  <div
                    style={{
                      fontSize: 11,
                      color: MUTED,
                    }}
                  >
                    {level.next.min - xp} XP →{' '}
                    {level.next.name}
                  </div>
                )}
              </div>

              <div
                style={{
                  height: 6,
                  background: '#2a2a2a',
                  borderRadius: 99,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${level.pct}%`,
                    background: ACCENT,
                    borderRadius: 99,
                    transition: 'width .4s',
                  }}
                />
              </div>
            </div>
          </div>

          {/* =====================================================
              PERSONAL INFORMATION
          ===================================================== */}

          <Section title="MES INFORMATIONS">
            {!editPersonal ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setPersonalError('');
                    setPersonalSaved(false);
                    setEditPersonal(true);
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 14,
                    padding: '16px 0',
                    border: 0,
                    borderBottom: `1px solid ${BORDER}`,
                    background: 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 12,
                        background: profileComplete
                          ? BG
                          : ACCENT,
                        display: 'grid',
                        placeItems: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <UserRound
                        size={18}
                        strokeWidth={2.4}
                      />
                    </div>

                    <div>
                      <div
                        style={{
                          fontSize: 15,
                          fontWeight: 750,
                        }}
                      >
                        Informations personnelles
                      </div>

                      <div
                        style={{
                          fontSize: 12,
                          color: MUTED,
                          marginTop: 3,
                        }}
                      >
                        {personalSummary}
                      </div>
                    </div>
                  </div>

                  <ChevronRight
                    size={17}
                    color={MUTED}
                  />
                </button>

                <div
                  style={{
                    padding: '14px 0 16px',
                    fontSize: 12,
                    lineHeight: 1.5,
                    color: MUTED,
                  }}
                >
                  Ces informations permettent à NOX
                  d’adapter notamment tes recommandations
                  nutritionnelles.
                </div>
              </>
            ) : (
              <div
                style={{
                  padding: '18px 0',
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    setEditPersonal(false)
                  }
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    border: 0,
                    background: 'transparent',
                    padding: '0 0 20px',
                    cursor: 'pointer',
                    color: BLACK,
                  }}
                >
                  <div
                    style={{
                      fontSize: 17,
                      fontWeight: 950,
                    }}
                  >
                    Tes informations
                  </div>

                  <ChevronUp size={18} />
                </button>

                {/* DATE OF BIRTH */}

                <div
                  style={{
                    marginBottom: 16,
                  }}
                >
                  <label
                    style={{
                      display: 'block',
                      fontSize: 12,
                      fontWeight: 850,
                      marginBottom: 7,
                    }}
                  >
                    Date de naissance
                  </label>

                  <input
                    type="date"
                    value={personal.date_of_birth}
                    onChange={(e) =>
                      setPersonal((current) => ({
                        ...current,
                        date_of_birth:
                          e.target.value,
                      }))
                    }
                    style={fieldStyle}
                  />
                </div>

                {/* SEX */}

                <div
                  style={{
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 850,
                      marginBottom: 7,
                    }}
                  >
                    Sexe utilisé pour le calcul énergétique
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns:
                        '1fr 1fr',
                      gap: 8,
                    }}
                  >
                    {[
                      {
                        value: 'homme',
                        label: 'Homme',
                      },
                      {
                        value: 'femme',
                        label: 'Femme',
                      },
                    ].map((option) => {
                      const active =
                        personal.sex.toLowerCase() ===
                        option.value;

                      return (
                        <button
                          type="button"
                          key={option.value}
                          onClick={() =>
                            setPersonal(
                              (current) => ({
                                ...current,
                                sex: option.value,
                              })
                            )
                          }
                          style={{
                            height: 52,
                            borderRadius: 14,
                            border: active
                              ? `2px solid ${BLACK}`
                              : `1px solid ${BORDER}`,
                            background: active
                              ? ACCENT
                              : BG,
                            color: BLACK,
                            fontSize: 14,
                            fontWeight: 850,
                            cursor: 'pointer',
                          }}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* HEIGHT */}

                <div
                  style={{
                    marginBottom: 16,
                  }}
                >
                  <label
                    style={{
                      display: 'block',
                      fontSize: 12,
                      fontWeight: 850,
                      marginBottom: 7,
                    }}
                  >
                    Taille
                  </label>

                  <div
                    style={{
                      position: 'relative',
                    }}
                  >
                    <input
                      type="number"
                      inputMode="decimal"
                      min="1"
                      value={personal.height_cm}
                      onChange={(e) =>
                        setPersonal(
                          (current) => ({
                            ...current,
                            height_cm:
                              e.target.value,
                          })
                        )
                      }
                      placeholder="Ex. 178"
                      style={{
                        ...fieldStyle,
                        paddingRight: 52,
                      }}
                    />

                    <span
                      style={{
                        position: 'absolute',
                        right: 15,
                        top: '50%',
                        transform:
                          'translateY(-50%)',
                        color: MUTED,
                        fontSize: 12,
                        fontWeight: 800,
                        pointerEvents: 'none',
                      }}
                    >
                      cm
                    </span>
                  </div>
                </div>

                {/* WEIGHT */}

                <div
                  style={{
                    marginBottom: 18,
                  }}
                >
                  <label
                    style={{
                      display: 'block',
                      fontSize: 12,
                      fontWeight: 850,
                      marginBottom: 7,
                    }}
                  >
                    Poids
                  </label>

                  <div
                    style={{
                      position: 'relative',
                    }}
                  >
                    <input
                      type="number"
                      inputMode="decimal"
                      min="1"
                      step="0.1"
                      value={
                        personal.starting_weight_kg
                      }
                      onChange={(e) =>
                        setPersonal(
                          (current) => ({
                            ...current,
                            starting_weight_kg:
                              e.target.value,
                          })
                        )
                      }
                      placeholder="Ex. 75"
                      style={{
                        ...fieldStyle,
                        paddingRight: 52,
                      }}
                    />

                    <span
                      style={{
                        position: 'absolute',
                        right: 15,
                        top: '50%',
                        transform:
                          'translateY(-50%)',
                        color: MUTED,
                        fontSize: 12,
                        fontWeight: 800,
                        pointerEvents: 'none',
                      }}
                    >
                      kg
                    </span>
                  </div>
                </div>

                {personalError && (
                  <div
                    style={{
                      background: '#FFF0ED',
                      border:
                        '1px solid #FFD2CA',
                      borderRadius: 14,
                      padding: '12px 14px',
                      color: '#C43D2F',
                      fontSize: 12,
                      lineHeight: 1.45,
                      marginBottom: 12,
                    }}
                  >
                    {personalError}
                  </div>
                )}

                <button
                  type="button"
                  disabled={savingPersonal}
                  onClick={savePersonalInformation}
                  style={{
                    width: '100%',
                    minHeight: 54,
                    border: 0,
                    borderRadius: 16,
                    background: BLACK,
                    color: WHITE,
                    fontSize: 13,
                    fontWeight: 950,
                    cursor: savingPersonal
                      ? 'wait'
                      : 'pointer',
                    opacity: savingPersonal
                      ? 0.7
                      : 1,
                  }}
                >
                  {savingPersonal
                    ? 'ENREGISTREMENT...'
                    : 'ENREGISTRER'}
                </button>
              </div>
            )}
          </Section>

          {/* SUCCESS FROM PERSONAL INFORMATION */}

          {personalSaved && (
            <div
              style={{
                background: '#F1FFD9',
                border: `1px solid ${ACCENT}`,
                borderRadius: 18,
                padding: 16,
                marginTop: -12,
                marginBottom: 28,
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 850,
                  color: '#53651B',
                  marginBottom:
                    fromNutrition ? 12 : 0,
                }}
              >
                Informations enregistrées ✓
              </div>

              {fromNutrition && (
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      '/nutrition-goals'
                    )
                  }
                  style={{
                    width: '100%',
                    minHeight: 48,
                    border: 0,
                    borderRadius: 14,
                    background: BLACK,
                    color: WHITE,
                    fontSize: 12,
                    fontWeight: 950,
                    cursor: 'pointer',
                  }}
                >
                  RETOURNER AU CAP NUTRITIONNEL
                </button>
              )}
            </div>
          )}

          {/* =====================================================
              DIRECTION
          ===================================================== */}

          <Section title="TA DIRECTION">
            <Row
              label="Objectif"
              value={goalLabel}
              onClick={() =>
                navigate('/onboarding')
              }
            />

            <Row
              label="NOX Future"
              onClick={() =>
                navigate('/future')
              }
            />

            <div
              style={{
                borderBottom: 'none',
              }}
            >
              <Row
                label="Mon corps"
                value={
                  profile?.starting_weight_kg
                    ? `${profile.starting_weight_kg} kg`
                    : undefined
                }
                onClick={() =>
                  navigate('/body')
                }
              />
            </div>
          </Section>

          {/* =====================================================
              NUTRITION
          ===================================================== */}

          <Section title="NUTRITION">
            <Row
              label="Journal alimentaire"
              onClick={() =>
                navigate('/fuel')
              }
            />

            <Row
              label="Mes recettes"
              onClick={() =>
                navigate('/recipes')
              }
            />

            <Row
              label="Planifier la semaine"
              onClick={() =>
                navigate('/meal-planner')
              }
            />

            <Row
              label="Liste de courses"
              onClick={() =>
                navigate('/quick-groceries')
              }
            />

            <div
              style={{
                borderBottom: 'none',
              }}
            >
              <Row
                label="Jeûne intermittent"
                onClick={() =>
                  navigate('/fasting')
                }
              />
            </div>
          </Section>

          {/* =====================================================
              TRAINING
          ===================================================== */}

          <Section title="ENTRAÎNEMENT">
            <Row
              label="Mon programme"
              onClick={() =>
                navigate('/program')
              }
            />

            <Row
              label="Calendrier"
              onClick={() =>
                navigate('/training-calendar')
              }
            />

            <div
              style={{
                borderBottom: 'none',
              }}
            >
              <Row
                label="Badges et progression"
                onClick={() =>
                  navigate('/play')
                }
              />
            </div>
          </Section>

          {/* =====================================================
              RECOVERY
          ===================================================== */}

          <Section title="SUIVI & RÉCUPÉRATION">
            <Row
              label="Progression"
              onClick={() =>
                navigate('/progress')
              }
            />

            <Row
              label="Récupération"
              onClick={() =>
                navigate('/recovery')
              }
            />

            <Row
              label="Sommeil"
              onClick={() =>
                navigate('/sleep')
              }
            />

            <div
              style={{
                borderBottom: 'none',
              }}
            >
              <Row
                label="Habitudes"
                onClick={() =>
                  navigate('/habits')
                }
              />
            </div>
          </Section>

          {/* =====================================================
              SUBSCRIPTION
          ===================================================== */}

          <Section title="ABONNEMENT">
            <Row
              label="Plan actuel"
              value={
                profile?.subscription_plan ===
                'pro'
                  ? 'NOX Pro'
                  : profile?.subscription_plan ===
                      'pro_plus'
                    ? 'NOX Pro+'
                    : 'Gratuit'
              }
            />

            <div
              style={{
                borderBottom: 'none',
              }}
            >
              <Row
                label="Passer à NOX Pro"
                onClick={() =>
                  navigate('/subscribe')
                }
              />
            </div>
          </Section>

          {/* =====================================================
              PREFERENCES
          ===================================================== */}

          <Section title="PRÉFÉRENCES">
            <Row
              label="Notifications"
              onClick={() =>
                navigate(
                  '/notification-settings'
                )
              }
            />

            <Row
              label="Politique de confidentialité"
              onClick={() =>
                setShowPrivacy(true)
              }
            />

            <div
              style={{
                borderBottom: 'none',
              }}
            >
              <Row
                label="Exporter mes données"
                value={
                  exporting
                    ? 'Export...'
                    : undefined
                }
                onClick={exportData}
              />
            </div>
          </Section>

          {/* =====================================================
              ACCOUNT
          ===================================================== */}

          <Section title="COMPTE">
            <Row
              label="Se déconnecter"
              onClick={async () => {
                await supabase.auth.signOut();
                navigate('/');
              }}
            />

            <div
              style={{
                borderBottom: 'none',
                paddingBottom: 4,
              }}
            >
              <Row
                label="Supprimer mon compte"
                onClick={() =>
                  setShowDelete(true)
                }
                danger
              />
            </div>
          </Section>

          <div
            style={{
              textAlign: 'center',
              fontSize: 10,
              color: '#C4C7C0',
              padding: '8px 0 20px',
            }}
          >
            NOX AI · noxai.fr
          </div>
        </main>
      </div>

      {/* =========================================================
          PRIVACY MODAL
      ========================================================= */}

      {showPrivacy && (
        <div
          onClick={() =>
            setShowPrivacy(false)
          }
          style={{
            position: 'fixed',
            inset: 0,
            background:
              'rgba(0,0,0,.5)',
            zIndex: 300,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
          }}
        >
          <div
            onClick={(e) =>
              e.stopPropagation()
            }
            style={{
              width: '100%',
              maxWidth: 560,
              background: WHITE,
              borderRadius:
                '24px 24px 0 0',
              padding:
                '24px 24px max(32px,env(safe-area-inset-bottom))',
              boxSizing: 'border-box',
              maxHeight: '80vh',
              overflowY: 'auto',
            }}
          >
            <div
              style={{
                fontSize: 22,
                fontWeight: 950,
                marginBottom: 20,
              }}
            >
              Confidentialité
            </div>

            {[
              {
                t: 'Données collectées',
                d: 'Uniquement les données que tu entres : poids, repas, séances, humeur. Aucune collecte automatique sans action explicite.',
              },
              {
                t: 'Stockage',
                d: 'Tes données sont stockées dans l’infrastructure utilisée par NOX.',
              },
              {
                t: 'Intelligence artificielle',
                d: 'Certaines fonctionnalités NOX peuvent transmettre les données nécessaires au traitement par les services d’intelligence artificielle configurés par l’application.',
              },
              {
                t: 'Tes droits',
                d: 'Tu peux exporter ou demander la suppression de tes données depuis ce menu.',
              },
            ].map(({ t, d }) => (
              <div
                key={t}
                style={{
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 800,
                    marginBottom: 4,
                  }}
                >
                  {t}
                </div>

                <div
                  style={{
                    fontSize: 13,
                    color: MUTED,
                    lineHeight: 1.6,
                  }}
                >
                  {d}
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={() =>
                setShowPrivacy(false)
              }
              style={{
                width: '100%',
                padding: 16,
                background: BLACK,
                border: 0,
                borderRadius: 16,
                color: ACCENT,
                fontWeight: 900,
                fontSize: 14,
                cursor: 'pointer',
                marginTop: 8,
              }}
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* =========================================================
          DELETE MODAL
      ========================================================= */}

      {showDelete && (
        <div
          onClick={() => {
            setShowDelete(false);
            setDeleteInput('');
          }}
          style={{
            position: 'fixed',
            inset: 0,
            background:
              'rgba(0,0,0,.5)',
            zIndex: 300,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
          }}
        >
          <div
            onClick={(e) =>
              e.stopPropagation()
            }
            style={{
              width: '100%',
              maxWidth: 560,
              background: WHITE,
              borderRadius:
                '24px 24px 0 0',
              padding:
                '24px 24px max(32px,env(safe-area-inset-bottom))',
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                fontSize: 22,
                fontWeight: 950,
                color: '#FF5C5C',
                marginBottom: 8,
              }}
            >
              Supprimer mon compte
            </div>

            <div
              style={{
                fontSize: 14,
                color: MUTED,
                lineHeight: 1.6,
                marginBottom: 20,
              }}
            >
              Action irréversible. Toutes tes
              données seront supprimées :
              séances, repas, poids, photos et
              records.
            </div>

            <div
              style={{
                fontSize: 13,
                color: MUTED,
                marginBottom: 8,
              }}
            >
              Tape{' '}
              <strong
                style={{
                  color: BLACK,
                }}
              >
                SUPPRIMER
              </strong>{' '}
              pour confirmer :
            </div>

            <input
              value={deleteInput}
              onChange={(e) =>
                setDeleteInput(
                  e.target.value
                )
              }
              placeholder="SUPPRIMER"
              style={{
                width: '100%',
                padding: '14px',
                background: BG,
                border: `1px solid ${BORDER}`,
                borderRadius: 14,
                color: BLACK,
                fontSize: 16,
                marginBottom: 16,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />

            <div
              style={{
                display: 'flex',
                gap: 10,
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setShowDelete(false);
                  setDeleteInput('');
                }}
                style={{
                  flex: 1,
                  padding: 16,
                  background:
                    'transparent',
                  border: `1px solid ${BORDER}`,
                  borderRadius: 14,
                  color: BLACK,
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                Annuler
              </button>

              <button
                type="button"
                onClick={
                  deleteAccount
                }
                disabled={
                  deleteInput !==
                  'SUPPRIMER'
                }
                style={{
                  flex: 2,
                  padding: 16,
                  background:
                    deleteInput ===
                    'SUPPRIMER'
                      ? '#FF5C5C'
                      : '#eee',
                  border: 'none',
                  borderRadius: 14,
                  color:
                    deleteInput ===
                    'SUPPRIMER'
                      ? WHITE
                      : MUTED,
                  fontWeight: 900,
                  fontSize: 14,
                  cursor:
                    deleteInput ===
                    'SUPPRIMER'
                      ? 'pointer'
                      : 'not-allowed',
                }}
              >
                SUPPRIMER
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav active="moi" />
    </div>
  );
}
