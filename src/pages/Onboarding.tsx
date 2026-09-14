import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Target,
  Dumbbell,
  RefreshCw,
  Trophy,
  Gauge,
  ShieldCheck,
  Sprout,
  Zap,
  Flame,
  Building2,
  House,
  Trees,
  MapPin,
  BarChart3,
  Check,
  Shuffle,
  CircleHelp,
  Monitor,
  Footprints,
  Activity,
  HeartPulse,
  CalendarDays,
  Sparkles,
  Clock3,
} from 'lucide-react';

import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import NoxLogo from '../components/NoxLogo';

const ACCENT = '#B7FF00';
const BLACK = '#0A0A0A';
const MUTED = '#777777';
const SURFACE = '#F7F7F7';
const BORDER = '#E8E8E8';

const TOTAL_STEPS = 12;

type IconType = (props: {
  size?: number;
  strokeWidth?: number;
}) => ReactNode;

type OptionCardProps = {
  label: string;
  selected: boolean;
  onClick: () => void;
  icon?: IconType;
  desc?: string;
};

function ProgressBar({
  step,
  total,
}: {
  step: number;
  total: number;
}) {
  const progress = (step / total) * 100;

  return (
    <div
      style={{
        width: '100%',
        height: 5,
        background: '#EEEEEE',
        borderRadius: 999,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: `${progress}%`,
          height: '100%',
          background: ACCENT,
          borderRadius: 999,
          transition: 'width 300ms ease',
        }}
      />
    </div>
  );
}

function OptionCard({
  label,
  selected,
  onClick,
  icon: Icon,
  desc,
}: OptionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%',
        minHeight: desc ? 76 : 68,
        padding: '14px 16px',
        borderRadius: 18,
        border: `1.5px solid ${selected ? BLACK : BORDER}`,
        background: selected ? '#F7FFD9' : '#FFFFFF',
        color: BLACK,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        textAlign: 'left',
        cursor: 'pointer',
        boxShadow: selected
          ? '0 8px 24px rgba(0,0,0,.06)'
          : '0 3px 12px rgba(0,0,0,.025)',
        transition:
          'transform 150ms ease, border-color 150ms ease, background 150ms ease',
      }}
    >
      {Icon && (
        <span
          style={{
            width: 42,
            height: 42,
            flexShrink: 0,
            borderRadius: 13,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: selected ? ACCENT : '#F5F5F5',
            color: BLACK,
          }}
        >
          <Icon size={20} strokeWidth={2} />
        </span>
      )}

      <div
        style={{
          minWidth: 0,
          flex: 1,
        }}
      >
        <div
          style={{
            fontSize: 14,
            lineHeight: 1.25,
            fontWeight: 800,
            color: BLACK,
          }}
        >
          {label}
        </div>

        {desc && (
          <div
            style={{
              marginTop: 4,
              fontSize: 12,
              lineHeight: 1.4,
              color: MUTED,
              fontWeight: 500,
            }}
          >
            {desc}
          </div>
        )}
      </div>

      <span
        style={{
          width: 22,
          height: 22,
          flexShrink: 0,
          borderRadius: '50%',
          border: `1.5px solid ${selected ? BLACK : '#D5D5D5'}`,
          background: selected ? BLACK : '#FFFFFF',
          color: ACCENT,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {selected && <Check size={13} strokeWidth={3} />}
      </span>
    </button>
  );
}

function SectionTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: string;
}) {
  return (
    <div
      style={{
        marginBottom: 28,
      }}
    >
      {eyebrow && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 12,
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: ACCENT,
            }}
          />

          <span
            style={{
              fontSize: 10,
              fontWeight: 850,
              letterSpacing: '0.12em',
              color: '#8A8A8A',
            }}
          >
            {eyebrow}
          </span>
        </div>
      )}

      <h1
        style={{
          margin: 0,
          color: BLACK,
          fontSize: 'clamp(30px, 8vw, 42px)',
          lineHeight: 1,
          letterSpacing: '-0.045em',
          fontWeight: 950,
        }}
      >
        {title}
      </h1>

      {description && (
        <p
          style={{
            margin: '13px 0 0',
            color: MUTED,
            fontSize: 14,
            lineHeight: 1.6,
            fontWeight: 500,
            maxWidth: 430,
          }}
        >
          {description}
        </p>
      )}
    </div>
  );
}

function BackButton({
  onClick,
}: {
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Retour"
      style={{
        height: 56,
        minWidth: 56,
        padding: '0 17px',
        borderRadius: 16,
        border: `1px solid ${BORDER}`,
        background: '#FFFFFF',
        color: BLACK,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <ArrowLeft size={20} strokeWidth={2.2} />
    </button>
  );
}

function ContinueButton({
  onClick,
  disabled = false,
  children = 'CONTINUER',
}: {
  onClick: () => void;
  disabled?: boolean;
  children?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        minHeight: 56,
        flex: 1,
        padding: '0 17px',
        border: 'none',
        borderRadius: 16,
        background: disabled ? '#EEEEEE' : ACCENT,
        color: disabled ? '#AAAAAA' : BLACK,
        fontSize: 12,
        fontWeight: 950,
        letterSpacing: '0.045em',
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        boxShadow: disabled
          ? 'none'
          : '0 12px 28px rgba(183,255,0,.18)',
        transition: 'all 150ms ease',
      }}
    >
      <span>{children}</span>

      {!disabled && (
        <ArrowRight
          size={18}
          strokeWidth={2.4}
        />
      )}
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  min,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  min?: string;
}) {
  return (
    <div>
      <label
        style={{
          display: 'block',
          marginBottom: 8,
          fontSize: 10,
          color: '#777777',
          fontWeight: 850,
          letterSpacing: '0.08em',
        }}
      >
        {label.toUpperCase()}
      </label>

      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type={type}
        placeholder={placeholder}
        min={min}
        style={{
          width: '100%',
          height: 56,
          boxSizing: 'border-box',
          padding: '0 16px',
          borderRadius: 16,
          background: SURFACE,
          border: `1px solid ${BORDER}`,
          color: BLACK,
          fontSize: 15,
          fontWeight: 600,
          outline: 'none',
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = BLACK;
          e.currentTarget.style.boxShadow =
            '0 0 0 3px rgba(183,255,0,.18)';
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = BORDER;
          e.currentTarget.style.boxShadow = 'none';
        }}
      />
    </div>
  );
}

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);

  const [data, setData] = useState<any>({
    goal: '',
    motivation: '',
    date_of_birth: '',
    height_cm: '',
    starting_weight_kg: '',
    target_weight: '',
    level: '',
    experience_level: '',
    location: '',
    equipment: [],
    sessions_per_week: '',
    session_length_min: '',
    available_days: [],
    diet_description: '',
    activity_level: '',
    target_date: '',
    sex: '',
    injuries: '',
  });

  const next = () =>
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));

  const back = () =>
    setStep((s) => Math.max(s - 1, 1));

  const set = (key: string, val: any) =>
    setData((d: any) => ({
      ...d,
      [key]: val,
    }));

  const finish = async () => {
    if (!user) return;

    await supabase.from('profiles').upsert({
      id: user.id,
      email: user.email,
      display_name: user.email?.split('@')[0],
      motivation: data.motivation,
      date_of_birth: data.date_of_birth || null,
      height_cm: Number(data.height_cm) || null,
      starting_weight_kg:
        Number(data.starting_weight_kg) || null,
      level: data.goal,
      experience_level: data.experience_level,
      equipment: data.equipment,
      available_days: data.available_days,
      session_length_min:
        Number(data.session_length_min) || 60,
      diet_description: data.diet_description,
      activity_level: data.activity_level,
      injuries: data.injuries,
      sex: data.sex,
      units: 'metric',
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    });

    // Sauvegarder l'objectif
    await supabase.from('goals').upsert({
      user_id: user.id,
      goal_type: data.goal,
      target_weight_kg:
        Number(data.target_weight) || null,
      target_date: data.target_date || null,
      sessions_per_week:
        Number(data.sessions_per_week) || 3,
      created_at: new Date().toISOString(),
    });

    navigate('/generate-program');
  };

  const nav = (
    disabled = false,
    onContinue = next,
    label: ReactNode = 'CONTINUER'
  ) => (
    <div
      style={{
        display: 'flex',
        gap: 10,
        marginTop: 30,
      }}
    >
      <BackButton onClick={back} />

      <ContinueButton
        onClick={onContinue}
        disabled={disabled}
      >
        {label}
      </ContinueButton>
    </div>
  );

  return (
    <main
      style={{
        minHeight: '100dvh',
        background: '#FFFFFF',
        color: BLACK,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* subtle NOX background */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          width: 380,
          height: 380,
          borderRadius: '50%',
          background: ACCENT,
          opacity: 0.055,
          filter: 'blur(30px)',
          top: -200,
          right: -180,
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          width: '100%',
          maxWidth: 520,
          margin: '0 auto',
          padding: '22px 20px 40px',
          boxSizing: 'border-box',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Header */}
        <header
          style={{
            marginBottom: 38,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 22,
            }}
          >
            <NoxLogo
              variant="green"
              showName
              size={34}
            />

            <span
              style={{
                fontSize: 10,
                color: '#999999',
                fontWeight: 850,
                letterSpacing: '0.08em',
              }}
            >
              {String(step).padStart(2, '0')} /{' '}
              {String(TOTAL_STEPS).padStart(2, '0')}
            </span>
          </div>

          <ProgressBar
            step={step}
            total={TOTAL_STEPS}
          />
        </header>

        {/* STEP 1 */}
        {step === 1 && (
          <div>
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: 22,
                background: ACCENT,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 28,
                transform: 'rotate(-3deg)',
              }}
            >
              <Sparkles
                size={30}
                strokeWidth={1.8}
              />
            </div>

            <SectionTitle
              eyebrow="≈ 3 MINUTES"
              title={
                <>
                  CONSTRUISONS
                  <br />
                  TON NOX.
                </>
              }
              description="Pour construire ton plan, NOX doit comprendre ton corps, ton objectif et ton mode de vie."
            />

            <div
              style={{
                marginTop: 34,
                padding: '18px',
                borderRadius: 18,
                background: '#F8F8F8',
                border: `1px solid ${BORDER}`,
                display: 'flex',
                alignItems: 'center',
                gap: 14,
              }}
            >
              <span
                style={{
                  width: 42,
                  height: 42,
                  flexShrink: 0,
                  borderRadius: 13,
                  background: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Clock3
                  size={20}
                  strokeWidth={2}
                />
              </span>

              <div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 850,
                  }}
                >
                  Un programme vraiment personnel
                </div>

                <div
                  style={{
                    marginTop: 3,
                    fontSize: 12,
                    color: MUTED,
                    lineHeight: 1.45,
                  }}
                >
                  Tes réponses permettent à NOX d’adapter
                  ton entraînement à ta réalité.
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: 30,
              }}
            >
              <ContinueButton onClick={next}>
                COMMENCER
              </ContinueButton>
            </div>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div>
            <SectionTitle
              eyebrow="TON OBJECTIF"
              title={
                <>
                  QU’EST-CE QUE
                  <br />
                  TU VEUX CHANGER ?
                </>
              }
              description="Choisis ta priorité principale. NOX construira ton plan autour de cet objectif."
            />

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              {[
                {
                  label: 'Perdre du gras',
                  icon: Flame,
                },
                {
                  label: 'Prendre du muscle',
                  icon: Dumbbell,
                },
                {
                  label: 'Recomposition corporelle',
                  icon: RefreshCw,
                },
                {
                  label: 'Devenir plus fort',
                  icon: Trophy,
                },
                {
                  label: 'Améliorer mes performances',
                  icon: Gauge,
                },
                {
                  label: 'Maintenir mon physique',
                  icon: ShieldCheck,
                },
              ].map((o) => (
                <OptionCard
                  key={o.label}
                  {...o}
                  selected={data.goal === o.label}
                  onClick={() =>
                    set('goal', o.label)
                  }
                />
              ))}
            </div>

            {nav(!data.goal)}
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div>
            <SectionTitle
              eyebrow="TON CORPS"
              title={
                <>
                  TON PROFIL
                  <br />
                  PHYSIQUE.
                </>
              }
              description="Ces données permettent à NOX de calibrer ta progression."
            />

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
              }}
            >
              <Field
                label="Date de naissance"
                value={data.date_of_birth}
                onChange={(value) =>
                  set('date_of_birth', value)
                }
                type="date"
              />

              <Field
                label="Taille (cm)"
                value={data.height_cm}
                onChange={(value) =>
                  set('height_cm', value)
                }
                type="number"
                placeholder="178"
              />

              <Field
                label="Poids actuel (kg)"
                value={data.starting_weight_kg}
                onChange={(value) =>
                  set('starting_weight_kg', value)
                }
                type="number"
                placeholder="80"
              />

              {(data.goal === 'Perdre du gras' ||
                data.goal === 'Prendre du muscle') && (
                <Field
                  label="Poids cible (kg)"
                  value={data.target_weight}
                  onChange={(value) =>
                    set('target_weight', value)
                  }
                  type="number"
                  placeholder="73"
                />
              )}
            </div>

            {nav()}
          </div>
        )}

        {/* STEP 4 */}
        {step === 4 && (
          <div>
            <SectionTitle
              eyebrow="EXPÉRIENCE"
              title={
                <>
                  QUEL EST
                  <br />
                  TON NIVEAU ?
                </>
              }
              description="NOX ajustera la difficulté, le volume et la progression."
            />

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              {[
                {
                  label: 'Débutant',
                  desc: 'Je commence ou je reprends',
                  icon: Sprout,
                  val: 'beginner',
                },
                {
                  label: 'Intermédiaire',
                  desc: '6 mois à 2 ans de pratique',
                  icon: Zap,
                  val: 'intermediate',
                },
                {
                  label: 'Avancé',
                  desc: '2 ans de pratique ou plus',
                  icon: Flame,
                  val: 'advanced',
                },
              ].map((o) => (
                <OptionCard
                  key={o.val}
                  label={o.label}
                  desc={o.desc}
                  icon={o.icon}
                  selected={
                    data.experience_level === o.val
                  }
                  onClick={() =>
                    set('experience_level', o.val)
                  }
                />
              ))}
            </div>

            {nav(!data.experience_level)}
          </div>
        )}

        {/* STEP 5 */}
        {step === 5 && (
          <div>
            <SectionTitle
              eyebrow="ENVIRONNEMENT"
              title={
                <>
                  OÙ T’ENTRAÎNES-
                  <br />
                  TU ?
                </>
              }
              description="Ton programme sera construit autour de l’environnement auquel tu as réellement accès."
            />

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              {[
                {
                  label: 'Salle de sport',
                  icon: Building2,
                },
                {
                  label: 'Maison',
                  icon: House,
                },
                {
                  label: 'Extérieur',
                  icon: Trees,
                },
                {
                  label: 'Plusieurs lieux',
                  icon: MapPin,
                },
              ].map((o) => (
                <OptionCard
                  key={o.label}
                  {...o}
                  selected={
                    data.location === o.label
                  }
                  onClick={() =>
                    set('location', o.label)
                  }
                />
              ))}
            </div>

            {nav(!data.location)}
          </div>
        )}

        {/* STEP 6 */}
        {step === 6 && (
          <div>
            <SectionTitle
              eyebrow="TON RYTHME"
              title={
                <>
                  TES
                  <br />
                  DISPONIBILITÉS.
                </>
              }
              description="Construisons un programme que tu peux réellement tenir."
            />

            <div
              style={{
                marginBottom: 28,
              }}
            >
              <label
                style={{
                  display: 'block',
                  marginBottom: 12,
                  fontSize: 10,
                  color: MUTED,
                  fontWeight: 850,
                  letterSpacing: '0.08em',
                }}
              >
                SÉANCES PAR SEMAINE
              </label>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'repeat(5, minmax(0, 1fr))',
                  gap: 8,
                }}
              >
                {[2, 3, 4, 5, 6].map((n) => {
                  const selected =
                    data.sessions_per_week === n;

                  return (
                    <button
                      type="button"
                      key={n}
                      onClick={() =>
                        set('sessions_per_week', n)
                      }
                      style={{
                        height: 56,
                        borderRadius: 16,
                        border: `1px solid ${
                          selected ? BLACK : BORDER
                        }`,
                        background: selected
                          ? ACCENT
                          : '#FFFFFF',
                        color: BLACK,
                        fontSize: 17,
                        fontWeight: 900,
                        cursor: 'pointer',
                      }}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  marginBottom: 12,
                  fontSize: 10,
                  color: MUTED,
                  fontWeight: 850,
                  letterSpacing: '0.08em',
                }}
              >
                DURÉE PAR SÉANCE
              </label>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'repeat(3, minmax(0, 1fr))',
                  gap: 8,
                }}
              >
                {[30, 45, 60, 75, 90].map((d) => {
                  const selected =
                    data.session_length_min === d;

                  return (
                    <button
                      type="button"
                      key={d}
                      onClick={() =>
                        set('session_length_min', d)
                      }
                      style={{
                        height: 52,
                        borderRadius: 15,
                        border: `1px solid ${
                          selected ? BLACK : BORDER
                        }`,
                        background: selected
                          ? '#F7FFD9'
                          : '#FFFFFF',
                        color: BLACK,
                        fontSize: 13,
                        fontWeight: 800,
                        cursor: 'pointer',
                      }}
                    >
                      {d} min
                    </button>
                  );
                })}
              </div>
            </div>

            {nav(
              !data.sessions_per_week ||
                !data.session_length_min
            )}
          </div>
        )}

        {/* STEP 7 */}
        {step === 7 && (
          <div>
            <SectionTitle
              eyebrow="TA SEMAINE"
              title={
                <>
                  QUELS
                  <br />
                  JOURS ?
                </>
              }
              description="Sélectionne tous les jours où tu peux généralement t’entraîner."
            />

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(2, minmax(0, 1fr))',
                gap: 10,
              }}
            >
              {[
                ['LUN', 'Lundi'],
                ['MAR', 'Mardi'],
                ['MER', 'Mercredi'],
                ['JEU', 'Jeudi'],
                ['VEN', 'Vendredi'],
                ['SAM', 'Samedi'],
                ['DIM', 'Dimanche'],
              ].map(([day, full]) => {
                const selected =
                  data.available_days.includes(day);

                return (
                  <button
                    type="button"
                    key={day}
                    onClick={() =>
                      set(
                        'available_days',
                        selected
                          ? data.available_days.filter(
                              (d: string) => d !== day
                            )
                          : [
                              ...data.available_days,
                              day,
                            ]
                      )
                    }
                    style={{
                      minHeight: 64,
                      padding: '0 14px',
                      borderRadius: 17,
                      border: `1.5px solid ${
                        selected ? BLACK : BORDER
                      }`,
                      background: selected
                        ? '#F7FFD9'
                        : '#FFFFFF',
                      color: BLACK,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                    }}
                  >
                    <div
                      style={{
                        textAlign: 'left',
                      }}
                    >
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 900,
                          color: '#999999',
                          letterSpacing: '.06em',
                        }}
                      >
                        {day}
                      </div>

                      <div
                        style={{
                          marginTop: 3,
                          fontSize: 13,
                          fontWeight: 800,
                        }}
                      >
                        {full}
                      </div>
                    </div>

                    <span
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        background: selected
                          ? ACCENT
                          : '#F4F4F4',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {selected && (
                        <Check
                          size={13}
                          strokeWidth={3}
                        />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            {nav(data.available_days.length === 0)}
          </div>
        )}

        {/* STEP 8 */}
        {step === 8 && (
          <div>
            <SectionTitle
              eyebrow="NUTRITION"
              title={
                <>
                  TON
                  <br />
                  ALIMENTATION.
                </>
              }
              description="Pas besoin d’être parfait. Dis simplement à NOX où tu en es aujourd’hui."
            />

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              {[
                {
                  label: 'Très structurée',
                  icon: BarChart3,
                },
                {
                  label: 'Plutôt correcte',
                  icon: Check,
                },
                {
                  label: 'Irrégulière',
                  icon: Shuffle,
                },
                {
                  label: 'Je ne sais pas vraiment',
                  icon: CircleHelp,
                },
              ].map((o) => (
                <OptionCard
                  key={o.label}
                  {...o}
                  selected={
                    data.diet_description === o.label
                  }
                  onClick={() =>
                    set(
                      'diet_description',
                      o.label
                    )
                  }
                />
              ))}
            </div>

            {nav(!data.diet_description)}
          </div>
        )}

        {/* STEP 9 */}
        {step === 9 && (
          <div>
            <SectionTitle
              eyebrow="ACTIVITÉ"
              title={
                <>
                  TON
                  <br />
                  QUOTIDIEN.
                </>
              }
              description="Ton niveau d’activité en dehors de l’entraînement influence directement ton plan."
            />

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              {[
                {
                  label: 'Principalement assis',
                  icon: Monitor,
                  val: 'sedentary',
                },
                {
                  label: 'Modérément actif',
                  icon: Footprints,
                  val: 'lightly_active',
                },
                {
                  label: 'Actif',
                  icon: Activity,
                  val: 'active',
                },
                {
                  label: 'Très actif',
                  icon: Zap,
                  val: 'very_active',
                },
              ].map((o) => (
                <OptionCard
                  key={o.val}
                  label={o.label}
                  icon={o.icon}
                  selected={
                    data.activity_level === o.val
                  }
                  onClick={() =>
                    set('activity_level', o.val)
                  }
                />
              ))}
            </div>

            {nav(!data.activity_level)}
          </div>
        )}

        {/* STEP 10 */}
        {step === 10 && (
          <div>
            <SectionTitle
              eyebrow="ADAPTATION"
              title={
                <>
                  BLESSURES OU
                  <br />
                  LIMITATIONS ?
                </>
              }
              description="NOX utilisera ces informations pour adapter ton programme en conséquence."
            />

            <div
              style={{
                padding: '16px',
                borderRadius: 18,
                background: '#F7F7F7',
                border: `1px solid ${BORDER}`,
                display: 'flex',
                gap: 12,
                marginBottom: 18,
              }}
            >
              <HeartPulse
                size={21}
                strokeWidth={2}
              />

              <p
                style={{
                  margin: 0,
                  color: MUTED,
                  fontSize: 12,
                  lineHeight: 1.5,
                }}
              >
                Indique uniquement ce qui peut influencer
                ton entraînement.
              </p>
            </div>

            <textarea
              value={data.injuries}
              onChange={(e) =>
                set('injuries', e.target.value)
              }
              rows={5}
              placeholder="Ex : douleur au genou droit, épaule fragile... ou aucune."
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '16px',
                borderRadius: 18,
                background: SURFACE,
                border: `1px solid ${BORDER}`,
                color: BLACK,
                fontSize: 14,
                lineHeight: 1.6,
                outline: 'none',
                resize: 'none',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor =
                  BLACK;
                e.currentTarget.style.boxShadow =
                  '0 0 0 3px rgba(183,255,0,.18)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor =
                  BORDER;
                e.currentTarget.style.boxShadow =
                  'none';
              }}
            />

            {nav()}
          </div>
        )}

        {/* STEP 11 */}
        {step === 11 && (
          <div>
            <SectionTitle
              eyebrow="TRAJECTOIRE"
              title={
                <>
                  QUAND VEUX-TU
                  <br />
                  Y ARRIVER ?
                </>
              }
              description="NOX analysera la trajectoire entre ton point de départ et ton objectif."
            />

            <Field
              label="Date cible"
              value={data.target_date}
              onChange={(value) =>
                set('target_date', value)
              }
              type="date"
              min={new Date()
                .toISOString()
                .split('T')[0]}
            />

            {data.target_date &&
              (() => {
                const weeks = Math.round(
                  (new Date(
                    data.target_date
                  ).getTime() -
                    Date.now()) /
                    (7 * 24 * 3600 * 1000)
                );

                const diff = Math.abs(
                  Number(
                    data.starting_weight_kg
                  ) -
                    Number(
                      data.target_weight ||
                        data.starting_weight_kg
                    )
                );

                const weeklyRate =
                  weeks > 0 && diff > 0
                    ? diff / weeks
                    : 0;

                let status = 'realistic';
                let msg = 'OBJECTIF RÉALISTE';
                let sub =
                  'Ta trajectoire semble cohérente.';

                if (weeklyRate > 1.2) {
                  status = 'adjust';
                  msg = 'OBJECTIF À AJUSTER';
                  sub =
                    'Le rythme demandé semble très élevé.';
                } else if (weeklyRate > 0.8) {
                  status = 'ambitious';
                  msg = 'OBJECTIF AMBITIEUX';
                  sub =
                    'La trajectoire demandera une forte régularité.';
                }

                return (
                  <div
                    style={{
                      marginTop: 18,
                      padding: '18px',
                      borderRadius: 18,
                      background:
                        status === 'realistic'
                          ? '#F7FFD9'
                          : '#F8F8F8',
                      border: `1px solid ${
                        status === 'realistic'
                          ? '#DDF7A0'
                          : BORDER
                      }`,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                      }}
                    >
                      <span
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: 13,
                          flexShrink: 0,
                          background:
                            status === 'realistic'
                              ? ACCENT
                              : '#EEEEEE',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {status === 'realistic' ? (
                          <Check
                            size={20}
                            strokeWidth={2.5}
                          />
                        ) : status ===
                          'ambitious' ? (
                          <Gauge
                            size={20}
                            strokeWidth={2}
                          />
                        ) : (
                          <Target
                            size={20}
                            strokeWidth={2}
                          />
                        )}
                      </span>

                      <div>
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 900,
                            letterSpacing: '.03em',
                          }}
                        >
                          {msg}
                        </div>

                        <div
                          style={{
                            marginTop: 3,
                            fontSize: 11,
                            lineHeight: 1.45,
                            color: MUTED,
                          }}
                        >
                          {sub}
                        </div>
                      </div>
                    </div>

                    {weeks > 0 && (
                      <div
                        style={{
                          marginTop: 14,
                          paddingTop: 13,
                          borderTop:
                            '1px solid rgba(0,0,0,.07)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 7,
                          color: MUTED,
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        <CalendarDays
                          size={15}
                          strokeWidth={2}
                        />
                        {weeks} semaines jusqu’à
                        l’objectif
                      </div>
                    )}
                  </div>
                );
              })()}

            {nav(!data.target_date)}
          </div>
        )}

        {/* STEP 12 */}
        {step === 12 && (
          <div>
            <div
              style={{
                width: 70,
                height: 70,
                borderRadius: 22,
                background: ACCENT,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 26,
              }}
            >
              <Target
                size={29}
                strokeWidth={1.9}
              />
            </div>

            <SectionTitle
              eyebrow="PROFIL TERMINÉ"
              title={
                <>
                  TON OBJECTIF
                  <br />
                  NOX.
                </>
              }
              description="Voilà ce que NOX a compris. Ton programme va maintenant être construit autour de ces données."
            />

            <div
              style={{
                borderRadius: 20,
                padding: '5px 18px',
                border: `1px solid ${BORDER}`,
                background: '#FFFFFF',
                boxShadow:
                  '0 12px 35px rgba(0,0,0,.04)',
              }}
            >
              {[
                ['Objectif', data.goal],
                [
                  'Poids actuel',
                  data.starting_weight_kg
                    ? `${data.starting_weight_kg} kg`
                    : '—',
                ],
                [
                  'Poids cible',
                  data.target_weight
                    ? `${data.target_weight} kg`
                    : '—',
                ],
                [
                  'Niveau',
                  data.experience_level || '—',
                ],
                ['Lieu', data.location || '—'],
                [
                  'Séances / semaine',
                  data.sessions_per_week || '—',
                ],
                [
                  'Durée',
                  data.session_length_min
                    ? `${data.session_length_min} min`
                    : '—',
                ],
                [
                  'Jours',
                  data.available_days.length
                    ? data.available_days.join(', ')
                    : '—',
                ],
              ].map(([k, v], index, array) => (
                <div
                  key={String(k)}
                  style={{
                    minHeight: 53,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 18,
                    borderBottom:
                      index === array.length - 1
                        ? 'none'
                        : `1px solid #F0F0F0`,
                  }}
                >
                  <span
                    style={{
                      color: '#888888',
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {k}
                  </span>

                  <span
                    style={{
                      color: BLACK,
                      fontSize: 12,
                      fontWeight: 850,
                      textAlign: 'right',
                    }}
                  >
                    {v}
                  </span>
                </div>
              ))}
            </div>

            <div
              style={{
                display: 'flex',
                gap: 10,
                marginTop: 26,
              }}
            >
              <BackButton onClick={back} />

              <ContinueButton onClick={finish}>
                CONSTRUIRE MON PLAN
              </ContinueButton>
            </div>

            <p
              style={{
                margin: '17px auto 0',
                maxWidth: 340,
                textAlign: 'center',
                color: '#AAAAAA',
                fontSize: 10,
                lineHeight: 1.5,
                fontWeight: 650,
              }}
            >
              NOX AI utilisera ces informations pour
              personnaliser ton entraînement et ta
              progression.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
