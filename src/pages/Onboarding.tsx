import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  Check,
  CircleHelp,
  Clock3,
  Dumbbell,
  Flame,
  Footprints,
  Gauge,
  HeartPulse,
  House,
  MapPin,
  Moon,
  ShieldCheck,
  Sparkles,
  Sprout,
  Target,
  Trees,
  Trophy,
  Utensils,
  Zap,
} from 'lucide-react';

import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';

const ACCENT = '#B7FF00';
const BLACK = '#0A0A0A';
const MUTED = '#777777';
const SURFACE = '#F7F7F7';
const BORDER = '#E8E8E8';
const TOTAL_STEPS = 17;

type IconType = (props: {
  size?: number;
  strokeWidth?: number;
}) => ReactNode;

type Option = {
  label: string;
  value?: string;
  desc?: string;
  icon?: IconType;
};

type OnboardingData = {
  goal: string;
  goal_priority: string;
  motivation: string;
  target_weight: string;
  target_date: string;
  date_of_birth: string;
  sex: string;
  height_cm: string;
  starting_weight_kg: string;
  usual_weight_kg: string;
  recent_weight_trend: string;
  experience_level: string;
  training_experience: string;
  recent_consistency: string;
  current_activities: string[];
  current_sessions_per_week: string;
  technique_confidence: string;
  rir_familiarity: string;
  sessions_per_week: string;
  session_length_min: string;
  available_days: string[];
  location: string;
  equipment: string[];
  training_preferences: string[];
  disliked_movements: string;
  body_priorities: string[];
  injuries: string;
  work_activity: string;
  activity_level: string;
  daily_steps: string;
  sleep_hours: string;
  sleep_quality: string;
  sleep_regularity: string;
  stress_level: string;
  usual_fatigue: string;
  recovery_quality: string;
  diet_type: string;
  dietary_exclusions: string;
  diet_description: string;
  meals_per_day: string;
  cooking_frequency: string;
  eating_out_frequency: string;
  food_budget: string;
  nutrition_tracking: string;
  nutrition_challenge: string;
  cardio_preference: string;
  cardio_frequency: string;
  dropout_reason: string;
  coaching_style: string;
};

const initialData: OnboardingData = {
  goal: '',
  goal_priority: '',
  motivation: '',
  target_weight: '',
  target_date: '',
  date_of_birth: '',
  sex: '',
  height_cm: '',
  starting_weight_kg: '',
  usual_weight_kg: '',
  recent_weight_trend: '',
  experience_level: '',
  training_experience: '',
  recent_consistency: '',
  current_activities: [],
  current_sessions_per_week: '',
  technique_confidence: '',
  rir_familiarity: '',
  sessions_per_week: '',
  session_length_min: '',
  available_days: [],
  location: '',
  equipment: [],
  training_preferences: [],
  disliked_movements: '',
  body_priorities: [],
  injuries: '',
  work_activity: '',
  activity_level: '',
  daily_steps: '',
  sleep_hours: '',
  sleep_quality: '',
  sleep_regularity: '',
  stress_level: '',
  usual_fatigue: '',
  recovery_quality: '',
  diet_type: '',
  dietary_exclusions: '',
  diet_description: '',
  meals_per_day: '',
  cooking_frequency: '',
  eating_out_frequency: '',
  food_budget: '',
  nutrition_tracking: '',
  nutrition_challenge: '',
  cardio_preference: '',
  cardio_frequency: '',
  dropout_reason: '',
  coaching_style: '',
};

function ProgressBar({ step }: { step: number }) {
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
          width: `${(step / TOTAL_STEPS) * 100}%`,
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
  desc,
  icon: Icon,
  selected,
  onClick,
  compact = false,
}: Option & {
  selected: boolean;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%',
        minHeight: compact ? 58 : desc ? 76 : 68,
        padding: compact ? '11px 13px' : '14px 16px',
        borderRadius: compact ? 15 : 18,
        border: `1.5px solid ${selected ? BLACK : BORDER}`,
        background: selected ? '#F7FFD9' : '#FFFFFF',
        color: BLACK,
        display: 'flex',
        alignItems: 'center',
        gap: compact ? 10 : 14,
        textAlign: 'left',
        cursor: 'pointer',
        boxShadow: selected
          ? '0 8px 24px rgba(0,0,0,.06)'
          : '0 3px 12px rgba(0,0,0,.025)',
      }}
    >
      {Icon && (
        <span
          style={{
            width: compact ? 36 : 42,
            height: compact ? 36 : 42,
            flexShrink: 0,
            borderRadius: compact ? 11 : 13,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: selected ? ACCENT : '#F5F5F5',
          }}
        >
          <Icon
            size={compact ? 18 : 20}
            strokeWidth={2}
          />
        </span>
      )}

      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontSize: compact ? 13 : 14,
            lineHeight: 1.25,
            fontWeight: 800,
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
          border: `1.5px solid ${
            selected ? BLACK : '#D5D5D5'
          }`,
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
  eyebrow: string;
  title: ReactNode;
  description?: string;
}) {
  return (
    <div style={{ marginBottom: 24 }}>
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
            letterSpacing: '.12em',
            color: '#8A8A8A',
          }}
        >
          {eyebrow}
        </span>
      </div>

      <h1
        style={{
          margin: 0,
          color: BLACK,
          fontSize: 'clamp(30px, 8vw, 42px)',
          lineHeight: 1,
          letterSpacing: '-.045em',
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
            maxWidth: 440,
          }}
        >
          {description}
        </p>
      )}
    </div>
  );
}

function SubTitle({
  children,
  optional = false,
}: {
  children: ReactNode;
  optional?: boolean;
}) {
  return (
    <div
      style={{
        margin: '25px 0 12px',
        display: 'flex',
        justifyContent: 'space-between',
        gap: 10,
        fontSize: 10,
        color: MUTED,
        fontWeight: 900,
        letterSpacing: '.09em',
      }}
    >
      <span>{children}</span>

      {optional && (
        <span
          style={{
            color: '#B0B0B0',
            fontWeight: 700,
          }}
        >
          OPTIONNEL
        </span>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  min,
  max,
  step,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  min?: string;
  max?: string;
  step?: string;
}) {
  return (
    <div>
      <label
        style={{
          display: 'block',
          marginBottom: 8,
          fontSize: 10,
          color: MUTED,
          fontWeight: 850,
          letterSpacing: '.08em',
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
        max={max}
        step={step}
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
      />
    </div>
  );
}

function TextArea({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={4}
      placeholder={placeholder}
      style={{
        width: '100%',
        boxSizing: 'border-box',
        padding: 16,
        borderRadius: 18,
        background: SURFACE,
        border: `1px solid ${BORDER}`,
        color: BLACK,
        fontSize: 14,
        lineHeight: 1.6,
        outline: 'none',
        resize: 'none',
      }}
    />
  );
}

function ChoiceList({
  options,
  value,
  onChange,
  compact = true,
}: {
  options: Option[];
  value: string;
  onChange: (v: string) => void;
  compact?: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 9,
      }}
    >
      {options.map((o) => (
        <OptionCard
          key={o.value || o.label}
          {...o}
          compact={compact}
          selected={value === (o.value || o.label)}
          onClick={() => onChange(o.value || o.label)}
        />
      ))}
    </div>
  );
}

function MultiChoice({
  options,
  values,
  onChange,
  columns = 2,
}: {
  options: Option[];
  values: string[];
  onChange: (v: string[]) => void;
  columns?: number;
}) {
  const toggle = (v: string) =>
    onChange(
      values.includes(v)
        ? values.filter((x) => x !== v)
        : [...values, v]
    );

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, minmax(0,1fr))`,
        gap: 9,
      }}
    >
      {options.map((o) => {
        const v = o.value || o.label;

        return (
          <OptionCard
            key={v}
            {...o}
            compact
            selected={values.includes(v)}
            onClick={() => toggle(v)}
          />
        );
      })}
    </div>
  );
}

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [data, setData] =
    useState<OnboardingData>(initialData);

  const set = <K extends keyof OnboardingData>(
    key: K,
    value: OnboardingData[K]
  ) =>
    setData((d) => ({
      ...d,
      [key]: value,
    }));

  const next = () => {
    setSaveError('');
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  const back = () => {
    setSaveError('');
    setStep((s) => Math.max(s - 1, 1));
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  const trajectory = useMemo(() => {
    if (
      !data.target_date ||
      !data.starting_weight_kg ||
      !data.target_weight
    ) {
      return null;
    }

    const weeks = Math.round(
      (new Date(data.target_date).getTime() -
        Date.now()) /
        (7 * 24 * 3600 * 1000)
    );

    const diff = Math.abs(
      Number(data.starting_weight_kg) -
        Number(data.target_weight)
    );

    const rate = weeks > 0 ? diff / weeks : 0;

    if (rate > 1.2) {
      return {
        weeks,
        label: 'OBJECTIF À AJUSTER',
        text: 'Le rythme demandé semble très élevé.',
      };
    }

    if (rate > 0.8) {
      return {
        weeks,
        label: 'OBJECTIF AMBITIEUX',
        text: 'Cette trajectoire demandera une forte régularité.',
      };
    }

    return {
      weeks,
      label: 'TRAJECTOIRE COHÉRENTE',
      text: 'NOX affinera cette trajectoire avec tes données réelles.',
    };
  }, [
    data.target_date,
    data.starting_weight_kg,
    data.target_weight,
  ]);

  const nav = (
    disabled = false,
    label = 'CONTINUER',
    action = next
  ) => (
    <div
      style={{
        display: 'flex',
        gap: 10,
        marginTop: 30,
      }}
    >
      {step > 1 && (
        <button
          type="button"
          onClick={back}
          aria-label="Retour"
          style={{
            height: 56,
            minWidth: 56,
            borderRadius: 16,
            border: `1px solid ${BORDER}`,
            background: '#FFF',
            cursor: 'pointer',
          }}
        >
          <ArrowLeft size={20} />
        </button>
      )}

      <button
        type="button"
        onClick={action}
        disabled={disabled || saving}
        style={{
          minHeight: 56,
          flex: 1,
          padding: '0 17px',
          border: 'none',
          borderRadius: 16,
          background:
            disabled || saving ? '#EEE' : ACCENT,
          color:
            disabled || saving ? '#AAA' : BLACK,
          fontSize: 12,
          fontWeight: 950,
          letterSpacing: '.045em',
          cursor:
            disabled || saving
              ? 'not-allowed'
              : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <span>
          {saving
            ? 'CRÉATION EN COURS...'
            : label}
        </span>

        {!disabled && !saving && (
          <ArrowRight size={18} />
        )}
      </button>
    </div>
  );

  const finish = async () => {
    if (!user || saving) return;

    setSaving(true);
    setSaveError('');

    try {
      const onboarding_context = {
        version: 2,
        goal_priority: data.goal_priority,
        usual_weight_kg:
          Number(data.usual_weight_kg) || null,
        recent_weight_trend:
          data.recent_weight_trend,
        training_experience:
          data.training_experience,
        recent_consistency:
          data.recent_consistency,
        current_activities:
          data.current_activities,
        current_sessions_per_week:
          Number(
            data.current_sessions_per_week
          ) || 0,
        technique_confidence:
          data.technique_confidence,
        rir_familiarity:
          data.rir_familiarity,
        location: data.location,
        training_preferences:
          data.training_preferences,
        disliked_movements:
          data.disliked_movements,
        body_priorities:
          data.body_priorities,
        work_activity: data.work_activity,
        daily_steps:
          Number(data.daily_steps) || null,
        sleep_hours:
          Number(data.sleep_hours) || null,
        sleep_quality: data.sleep_quality,
        sleep_regularity:
          data.sleep_regularity,
        stress_level: data.stress_level,
        usual_fatigue: data.usual_fatigue,
        recovery_quality:
          data.recovery_quality,
        diet_type: data.diet_type,
        dietary_exclusions:
          data.dietary_exclusions,
        meals_per_day:
          Number(data.meals_per_day) || null,
        cooking_frequency:
          data.cooking_frequency,
        eating_out_frequency:
          data.eating_out_frequency,
        food_budget: data.food_budget,
        nutrition_tracking:
          data.nutrition_tracking,
        nutrition_challenge:
          data.nutrition_challenge,
        cardio_preference:
          data.cardio_preference,
        cardio_frequency:
          data.cardio_frequency,
        dropout_reason:
          data.dropout_reason,
        coaching_style:
          data.coaching_style,
      };

      const { error: profileError } =
        await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            email: user.email,
            display_name:
              user.email?.split('@')[0],
            motivation: data.motivation,
            date_of_birth:
              data.date_of_birth || null,
            height_cm:
              Number(data.height_cm) || null,
            starting_weight_kg:
              Number(
                data.starting_weight_kg
              ) || null,

            // level supprimé :
            // la colonne Supabase est int4
            // et ne doit pas recevoir data.goal.

            experience_level:
              data.experience_level,

            equipment: data.equipment,

            // Supabase attend des entiers.
            available_days:
              data.available_days.map(
                (day) => Number(day)
              ),

            session_length_min:
              Number(
                data.session_length_min
              ) || 60,

            diet_description:
              data.diet_description,

            activity_level:
              data.activity_level,

            injuries: data.injuries,
            sex: data.sex,
            units: 'metric',

            onboarding_context,

            onboarding_completed: true,

            updated_at:
              new Date().toISOString(),
          });

      if (profileError) {
        throw profileError;
      }

      const { error: goalError } =
        await supabase
          .from('goals')
          .upsert({
            user_id: user.id,

            // goals.goal_type est TEXT :
            // l'objectif reste donc sous forme lisible.
            goal_type: data.goal,

            target_weight_kg:
              Number(
                data.target_weight
              ) || null,

            target_date:
              data.target_date || null,

            sessions_per_week:
              Number(
                data.sessions_per_week
              ) || 3,

            created_at:
              new Date().toISOString(),
          });

      if (goalError) {
        throw goalError;
      }

      navigate('/generate-program');
    } catch (error: any) {
      console.error(
        'Onboarding save error:',
        error
      );

      setSaveError(
        error?.message ||
          'Impossible d’enregistrer ton profil pour le moment. Réessaie.'
      );

      setSaving(false);
    }
  };

  return (
    <main
      style={{
        minHeight: '100dvh',
        background: '#FFF',
        color: BLACK,
        overflowX: 'hidden',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 560,
          margin: '0 auto',
          padding: '22px 20px 44px',
          boxSizing: 'border-box',
        }}
      >
        <header style={{ marginBottom: 32 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent:
                'space-between',
              marginBottom: 22,
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'baseline',
                gap: 6,
              }}
            >
              <span
                style={{
                  fontSize: 24,
                  fontWeight: 950,
                  letterSpacing: '-.055em',
                }}
              >
                NOX
              </span>

              <span
                style={{
                  fontSize: 10,
                  fontWeight: 900,
                  letterSpacing: '.12em',
                  color: MUTED,
                }}
              >
                AI
              </span>
            </div>

            <span
              style={{
                fontSize: 10,
                color: '#999',
                fontWeight: 850,
                letterSpacing: '.08em',
              }}
            >
              {String(step).padStart(2, '0')}{' '}
              / {TOTAL_STEPS}
            </span>
          </div>

          <ProgressBar step={step} />
        </header>

        {step === 1 && (
          <div>
            <SectionTitle
              eyebrow="01 · OBJECTIF"
              title={
                <>
                  QU'EST-CE QUI
                  <br />
                  DOIT CHANGER ?
                </>
              }
              description="NOX part de ton objectif réel, pas d'un programme générique."
            />

            <ChoiceList
              value={data.goal}
              onChange={(v) =>
                set('goal', v)
              }
              options={[
                {
                  label: 'Perdre du gras',
                  icon: Flame,
                },
                {
                  label:
                    'Prendre du muscle',
                  icon: Dumbbell,
                },
                {
                  label:
                    'Recomposition corporelle',
                  icon: Sparkles,
                },
                {
                  label:
                    'Devenir plus fort',
                  icon: Trophy,
                },
                {
                  label:
                    'Améliorer mes performances',
                  icon: Gauge,
                },
                {
                  label:
                    'Maintenir mon physique',
                  icon: ShieldCheck,
                },
              ]}
            />

            {nav(!data.goal)}
          </div>
        )}

        {step === 2 && (
          <div>
            <SectionTitle
              eyebrow="02 · PRIORITÉ"
              title={
                <>
                  CE QUI COMPTE
                  <br />
                  VRAIMENT POUR TOI.
                </>
              }
              description="Deux personnes avec le même objectif peuvent avoir des priorités très différentes."
            />

            <SubTitle>
              TA PRIORITÉ N°1
            </SubTitle>

            <ChoiceList
              value={data.goal_priority}
              onChange={(v) =>
                set('goal_priority', v)
              }
              options={[
                {
                  label:
                    'Mon apparence physique',
                  icon: Sparkles,
                },
                {
                  label: 'Ma force',
                  icon: Dumbbell,
                },
                {
                  label:
                    'Mes performances',
                  icon: Trophy,
                },
                {
                  label:
                    'Mon énergie et ma forme',
                  icon: Zap,
                },
                {
                  label: 'Ma régularité',
                  icon: Target,
                },
              ]}
            />

            <SubTitle optional>
              POURQUOI MAINTENANT ?
            </SubTitle>

            <TextArea
              value={data.motivation}
              onChange={(v) =>
                set('motivation', v)
              }
              placeholder="Ex : retrouver confiance, préparer l'été, reprendre après une longue pause..."
            />

            {nav(!data.goal_priority)}
          </div>
        )}

        {step === 3 && (
          <div>
            <SectionTitle
              eyebrow="03 · TON CORPS"
              title={
                <>
                  DONNE-NOUS
                  <br />
                  LES BASES.
                </>
              }
              description="Ces données servent aux estimations et à la personnalisation initiale."
            />

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(2,minmax(0,1fr))',
                gap: 12,
              }}
            >
              <div
                style={{
                  gridColumn: '1/-1',
                }}
              >
                <Field
                  label="Date de naissance"
                  value={
                    data.date_of_birth
                  }
                  onChange={(v) =>
                    set(
                      'date_of_birth',
                      v
                    )
                  }
                  type="date"
                />
              </div>

              <Field
                label="Taille (cm)"
                value={data.height_cm}
                onChange={(v) =>
                  set('height_cm', v)
                }
                type="number"
                placeholder="178"
                min="120"
                max="230"
              />

              <Field
                label="Poids actuel (kg)"
                value={
                  data.starting_weight_kg
                }
                onChange={(v) =>
                  set(
                    'starting_weight_kg',
                    v
                  )
                }
                type="number"
                placeholder="80"
                min="30"
                max="350"
                step="0.1"
              />
            </div>

            <SubTitle>
              SEXE UTILISÉ POUR LES
              ESTIMATIONS PHYSIOLOGIQUES
            </SubTitle>

            <ChoiceList
              value={data.sex}
              onChange={(v) =>
                set('sex', v)
              }
              options={[
                {
                  label: 'Homme',
                  value: 'male',
                },
                {
                  label: 'Femme',
                  value: 'female',
                },
                {
                  label:
                    'Je préfère ne pas répondre',
                  value: 'unspecified',
                },
              ]}
            />

            {nav(
              !data.date_of_birth ||
                !data.height_cm ||
                !data.starting_weight_kg ||
                !data.sex
            )}
          </div>
        )}

        {step === 4 && (
          <div>
            <SectionTitle
              eyebrow="04 · TRAJECTOIRE"
              title={
                <>
                  D'OÙ TU VIENS.
                  <br />
                  OÙ TU VAS.
                </>
              }
              description="Le poids n'est qu'un signal parmi d'autres. NOX l'utilise comme tendance, pas comme verdict."
            />

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(2,minmax(0,1fr))',
                gap: 12,
              }}
            >
              <Field
                label="Poids habituel (kg)"
                value={
                  data.usual_weight_kg
                }
                onChange={(v) =>
                  set(
                    'usual_weight_kg',
                    v
                  )
                }
                type="number"
                placeholder="80"
                step="0.1"
              />

              <Field
                label="Poids cible (kg)"
                value={data.target_weight}
                onChange={(v) =>
                  set(
                    'target_weight',
                    v
                  )
                }
                type="number"
                placeholder="75"
                step="0.1"
              />
            </div>

            <SubTitle>
              CES DERNIERS MOIS, TON
              POIDS...
            </SubTitle>

            <ChoiceList
              value={
                data.recent_weight_trend
              }
              onChange={(v) =>
                set(
                  'recent_weight_trend',
                  v
                )
              }
              options={[
                {
                  label:
                    'A plutôt baissé',
                  value: 'down',
                },
                {
                  label:
                    'Est resté stable',
                  value: 'stable',
                },
                {
                  label:
                    'A plutôt augmenté',
                  value: 'up',
                },
                {
                  label:
                    'A beaucoup fluctué',
                  value: 'variable',
                },
              ]}
            />

            <SubTitle optional>
              DATE CIBLE
            </SubTitle>

            <Field
              label="Date cible"
              value={data.target_date}
              onChange={(v) =>
                set('target_date', v)
              }
              type="date"
              min={
                new Date()
                  .toISOString()
                  .split('T')[0]
              }
            />

            {trajectory && (
              <div
                style={{
                  marginTop: 14,
                  padding: 16,
                  borderRadius: 17,
                  background: '#F7FFD9',
                  border:
                    '1px solid #DDF7A0',
                }}
              >
                <b
                  style={{
                    fontSize: 12,
                  }}
                >
                  {trajectory.label}
                </b>

                <div
                  style={{
                    marginTop: 5,
                    color: MUTED,
                    fontSize: 12,
                  }}
                >
                  {trajectory.text}
                  {trajectory.weeks > 0
                    ? ` · ${trajectory.weeks} semaines.`
                    : ''}
                </div>
              </div>
            )}

            {nav(
              !data.recent_weight_trend
            )}
          </div>
        )}

        {step === 5 && (
          <div>
            <SectionTitle
              eyebrow="05 · EXPÉRIENCE"
              title={
                <>
                  TON NIVEAU.
                  <br />
                  SANS EGO.
                </>
              }
              description="NOX adapte le volume, la complexité et la calibration à ton expérience réelle."
            />

            <ChoiceList
              value={
                data.experience_level
              }
              onChange={(v) =>
                set(
                  'experience_level',
                  v
                )
              }
              compact={false}
              options={[
                {
                  label: 'Débutant',
                  value: 'beginner',
                  desc: 'Je commence ou je reprends',
                  icon: Sprout,
                },
                {
                  label:
                    'Intermédiaire',
                  value:
                    'intermediate',
                  desc: 'Je m’entraîne déjà avec régularité',
                  icon: Zap,
                },
                {
                  label: 'Avancé',
                  value: 'advanced',
                  desc: 'Plusieurs années de pratique structurée',
                  icon: Flame,
                },
              ]}
            />

            <SubTitle>
              DEPUIS COMBIEN DE TEMPS ?
            </SubTitle>

            <ChoiceList
              value={
                data.training_experience
              }
              onChange={(v) =>
                set(
                  'training_experience',
                  v
                )
              }
              options={[
                {
                  label:
                    'Moins de 3 mois',
                },
                {
                  label: '3 à 6 mois',
                },
                {
                  label:
                    '6 à 12 mois',
                },
                {
                  label: '1 à 2 ans',
                },
                {
                  label: '2 à 5 ans',
                },
                {
                  label:
                    '5 ans ou plus',
                },
              ]}
            />

            {nav(
              !data.experience_level ||
                !data.training_experience
            )}
          </div>
        )}

        {step === 6 && (
          <div>
            <SectionTitle
              eyebrow="06 · RÉGULARITÉ"
              title={
                <>
                  CE QUE TU FAIS
                  <br />
                  AUJOURD'HUI.
                </>
              }
              description="Ton historique récent compte davantage qu'un ancien niveau jamais entretenu."
            />

            <SubTitle>
              CES 8 DERNIÈRES SEMAINES
            </SubTitle>

            <ChoiceList
              value={
                data.recent_consistency
              }
              onChange={(v) =>
                set(
                  'recent_consistency',
                  v
                )
              }
              options={[
                {
                  label:
                    'Presque aucune séance',
                },
                {
                  label: 'Irrégulier',
                },
                {
                  label:
                    'Plutôt régulier',
                },
                {
                  label:
                    'Très régulier',
                },
              ]}
            />

            <SubTitle optional>
              ACTIVITÉS ACTUELLES
            </SubTitle>

            <MultiChoice
              values={
                data.current_activities
              }
              onChange={(v) =>
                set(
                  'current_activities',
                  v
                )
              }
              options={[
                {
                  label: 'Musculation',
                },
                {
                  label: 'Course',
                },
                {
                  label: 'Vélo',
                },
                {
                  label:
                    'Sport collectif',
                },
                {
                  label: 'Combat',
                },
                {
                  label: 'Natation',
                },
                {
                  label:
                    'Cross training',
                },
                {
                  label: 'Autre',
                },
              ]}
            />

            <SubTitle optional>
              SÉANCES ACTUELLES / SEMAINE
            </SubTitle>

            <ChoiceList
              value={
                data.current_sessions_per_week
              }
              onChange={(v) =>
                set(
                  'current_sessions_per_week',
                  v
                )
              }
              options={[
                0, 1, 2, 3, 4, 5, 6, 7,
              ].map((n) => ({
                label:
                  n === 0
                    ? 'Aucune actuellement'
                    : `${n} séance${
                        n > 1 ? 's' : ''
                      }`,
                value: String(n),
              }))}
            />

            {nav(
              !data.recent_consistency
            )}
          </div>
        )}

        {step === 7 && (
          <div>
            <SectionTitle
              eyebrow="07 · MAÎTRISE"
              title={
                <>
                  COMMENT TU
                  <br />
                  T'ENTRAÎNES.
                </>
              }
              description="Cela détermine le niveau de guidage et la façon dont NOX calibre tes premières séances."
            />

            <SubTitle>
              TECHNIQUE SUR LES EXERCICES
            </SubTitle>

            <ChoiceList
              value={
                data.technique_confidence
              }
              onChange={(v) =>
                set(
                  'technique_confidence',
                  v
                )
              }
              options={[
                {
                  label:
                    'J’ai besoin d’être beaucoup guidé',
                  value: 'low',
                },
                {
                  label:
                    'Je connais les mouvements de base',
                  value: 'medium',
                },
                {
                  label:
                    'Je suis autonome techniquement',
                  value: 'high',
                },
              ]}
            />

            <SubTitle>
              RPE / RIR
            </SubTitle>

            <ChoiceList
              value={
                data.rir_familiarity
              }
              onChange={(v) =>
                set(
                  'rir_familiarity',
                  v
                )
              }
              options={[
                {
                  label:
                    'Je ne connais pas',
                  value: 'none',
                },
                {
                  label:
                    'J’en ai entendu parler',
                  value: 'basic',
                },
                {
                  label:
                    'Je sais les utiliser',
                  value:
                    'comfortable',
                },
              ]}
            />

            {nav(
              !data.technique_confidence ||
                !data.rir_familiarity
            )}
          </div>
        )}

        {step === 8 && (
          <div>
            <SectionTitle
              eyebrow="08 · DISPONIBILITÉS"
              title={
                <>
                  UN PLAN QUI
                  <br />
                  TIENT VRAIMENT.
                </>
              }
              description="On construit autour de ta vraie semaine, pas autour d'une semaine parfaite."
            />

            <SubTitle>
              SÉANCES PAR SEMAINE
            </SubTitle>

            <MultiChoice
              columns={5}
              values={
                data.sessions_per_week
                  ? [
                      data.sessions_per_week,
                    ]
                  : []
              }
              onChange={(v) =>
                set(
                  'sessions_per_week',
                  v.at(-1) || ''
                )
              }
              options={[
                2, 3, 4, 5, 6,
              ].map((n) => ({
                label: String(n),
                value: String(n),
              }))}
            />

            <SubTitle>
              DURÉE PAR SÉANCE
            </SubTitle>

            <MultiChoice
              columns={3}
              values={
                data.session_length_min
                  ? [
                      data.session_length_min,
                    ]
                  : []
              }
              onChange={(v) =>
                set(
                  'session_length_min',
                  v.at(-1) || ''
                )
              }
              options={[
                30, 45, 60, 75, 90,
              ].map((n) => ({
                label: `${n} min`,
                value: String(n),
              }))}
            />

            <SubTitle>
              JOURS DISPONIBLES
            </SubTitle>

            <MultiChoice
              values={
                data.available_days
              }
              onChange={(v) =>
                set(
                  'available_days',
                  v
                )
              }
              options={[
                {
                  label: 'LUN',
                  value: '1',
                },
                {
                  label: 'MAR',
                  value: '2',
                },
                {
                  label: 'MER',
                  value: '3',
                },
                {
                  label: 'JEU',
                  value: '4',
                },
                {
                  label: 'VEN',
                  value: '5',
                },
                {
                  label: 'SAM',
                  value: '6',
                },
                {
                  label: 'DIM',
                  value: '7',
                },
              ]}
            />

            {nav(
              !data.sessions_per_week ||
                !data.session_length_min ||
                data.available_days
                  .length === 0
            )}
          </div>
        )}

        {step === 9 && (
          <div>
            <SectionTitle
              eyebrow="09 · ENVIRONNEMENT"
              title={
                <>
                  TON TERRAIN
                  <br />
                  DE JEU.
                </>
              }
              description="NOX ne doit jamais te proposer un exercice que ton environnement rend impossible."
            />

            <SubTitle>
              OÙ T'ENTRAÎNES-TU ?
            </SubTitle>

            <ChoiceList
              value={data.location}
              onChange={(v) =>
                set('location', v)
              }
              options={[
                {
                  label:
                    'Salle de sport',
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
                  label:
                    'Plusieurs lieux',
                  icon: MapPin,
                },
              ]}
            />

            <SubTitle>
              MATÉRIEL DISPONIBLE
            </SubTitle>

            <MultiChoice
              values={data.equipment}
              onChange={(v) =>
                set('equipment', v)
              }
              options={[
                {
                  label: 'Machines',
                },
                {
                  label: 'Haltères',
                },
                {
                  label:
                    'Barre + disques',
                },
                {
                  label: 'Rack',
                },
                {
                  label: 'Banc',
                },
                {
                  label: 'Poulies',
                },
                {
                  label:
                    'Kettlebells',
                },
                {
                  label: 'Élastiques',
                },
                {
                  label:
                    'Poids du corps',
                },
                {
                  label: 'Cardio',
                },
              ]}
            />

            {nav(
              !data.location ||
                data.equipment.length ===
                  0
            )}
          </div>
        )}

        {step === 10 && (
          <div>
            <SectionTitle
              eyebrow="10 · PRÉFÉRENCES"
              title={
                <>
                  UN PROGRAMME
                  <br />
                  QUE TU VEUX FAIRE.
                </>
              }
              description="L'adhérence compte. NOX peut privilégier ce que tu aimes sans sacrifier la logique du programme."
            />

            <SubTitle optional>
              CE QUE TU AIMES
            </SubTitle>

            <MultiChoice
              values={
                data.training_preferences
              }
              onChange={(v) =>
                set(
                  'training_preferences',
                  v
                )
              }
              options={[
                {
                  label: 'Machines',
                },
                {
                  label:
                    'Poids libres',
                },
                {
                  label:
                    'Exercices simples',
                },
                {
                  label:
                    'Séances intenses',
                },
                {
                  label: 'Circuits',
                },
                {
                  label:
                    'Travail de force',
                },
              ]}
            />

            <SubTitle optional>
              ZONES QUE TU VEUX PRIORISER
            </SubTitle>

            <MultiChoice
              values={
                data.body_priorities
              }
              onChange={(v) =>
                set(
                  'body_priorities',
                  v
                )
              }
              options={[
                {
                  label: 'Pectoraux',
                },
                {
                  label: 'Dos',
                },
                {
                  label: 'Épaules',
                },
                {
                  label: 'Bras',
                },
                {
                  label: 'Fessiers',
                },
                {
                  label: 'Jambes',
                },
                {
                  label: 'Abdos',
                },
                {
                  label:
                    'Aucune priorité',
                },
              ]}
            />

            <SubTitle optional>
              MOUVEMENTS QUE TU N'AIMES PAS
            </SubTitle>

            <TextArea
              value={
                data.disliked_movements
              }
              onChange={(v) =>
                set(
                  'disliked_movements',
                  v
                )
              }
              placeholder="Ex : burpees, course, squat barre..."
            />

            {nav(false)}
          </div>
        )}

        {step === 11 && (
          <div>
            <SectionTitle
              eyebrow="11 · CONTRAINTES"
              title={
                <>
                  ON S'ADAPTE
                  <br />
                  À TON CORPS.
                </>
              }
              description="Indique seulement ce qui peut influencer l'entraînement. NOX ne pose pas de diagnostic médical."
            />

            <div
              style={{
                padding: 15,
                borderRadius: 17,
                background: SURFACE,
                border: `1px solid ${BORDER}`,
                display: 'flex',
                gap: 11,
              }}
            >
              <HeartPulse size={20} />

              <p
                style={{
                  margin: 0,
                  color: MUTED,
                  fontSize: 12,
                  lineHeight: 1.5,
                }}
              >
                Cette réponse est
                optionnelle. En cas de
                douleur persistante ou de
                problème médical, demande
                l'avis d'un professionnel
                qualifié.
              </p>
            </div>

            <SubTitle optional>
              LIMITATIONS / MOUVEMENTS À
              ÉVITER
            </SubTitle>

            <TextArea
              value={data.injuries}
              onChange={(v) =>
                set('injuries', v)
              }
              placeholder="Ex : éviter les impacts, gêne sur certains mouvements..."
            />

            {nav(false)}
          </div>
        )}

        {step === 12 && (
          <div>
            <SectionTitle
              eyebrow="12 · QUOTIDIEN"
              title={
                <>
                  TA VIE COMPTE
                  <br />
                  AUTANT QUE LA SALLE.
                </>
              }
              description="Ton activité hors entraînement influence la récupération et les estimations énergétiques."
            />

            <SubTitle>
              TON TRAVAIL / TA JOURNÉE
            </SubTitle>

            <ChoiceList
              value={
                data.work_activity
              }
              onChange={(v) => {
                set(
                  'work_activity',
                  v
                );

                const map: Record<
                  string,
                  string
                > = {
                  seated:
                    'sedentary',
                  standing:
                    'lightly_active',
                  active: 'active',
                  physical:
                    'very_active',
                };

                set(
                  'activity_level',
                  map[v] ||
                    'lightly_active'
                );
              }}
              options={[
                {
                  label:
                    'Principalement assis',
                  value: 'seated',
                  icon:
                    BriefcaseBusiness,
                },
                {
                  label:
                    'Souvent debout',
                  value: 'standing',
                  icon: Footprints,
                },
                {
                  label:
                    'Actif / beaucoup de marche',
                  value: 'active',
                  icon: Activity,
                },
                {
                  label:
                    'Travail très physique',
                  value: 'physical',
                  icon: Zap,
                },
              ]}
            />

            <SubTitle optional>
              PAS QUOTIDIENS MOYENS
            </SubTitle>

            <Field
              label="Pas / jour"
              value={data.daily_steps}
              onChange={(v) =>
                set(
                  'daily_steps',
                  v
                )
              }
              type="number"
              placeholder="8000"
              min="0"
              max="50000"
            />

            {nav(
              !data.work_activity
            )}
          </div>
        )}

        {step === 13 && (
          <div>
            <SectionTitle
              eyebrow="13 · SOMMEIL"
              title={
                <>
                  COMMENT TU
                  <br />
                  RÉCUPÈRES.
                </>
              }
              description="NOX utilisera ces repères comme contexte, puis apprendra de tes check-ins réels."
            />

            <SubTitle>
              HEURES MOYENNES
            </SubTitle>

            <ChoiceList
              value={
                data.sleep_hours
              }
              onChange={(v) =>
                set(
                  'sleep_hours',
                  v
                )
              }
              options={[
                '<5',
                '5',
                '6',
                '7',
                '8',
                '9',
                '10+',
              ].map((v) => ({
                label:
                  v === '<5'
                    ? 'Moins de 5 h'
                    : v === '10+'
                    ? '10 h ou plus'
                    : `${v} h`,
                value:
                  v === '<5'
                    ? '4.5'
                    : v === '10+'
                    ? '10'
                    : v,
              }))}
            />

            <SubTitle>
              QUALITÉ DU SOMMEIL
            </SubTitle>

            <ChoiceList
              value={
                data.sleep_quality
              }
              onChange={(v) =>
                set(
                  'sleep_quality',
                  v
                )
              }
              options={[
                {
                  label: 'Mauvaise',
                  value: 'poor',
                },
                {
                  label: 'Moyenne',
                  value: 'average',
                },
                {
                  label: 'Bonne',
                  value: 'good',
                },
                {
                  label: 'Excellente',
                  value: 'excellent',
                },
              ]}
            />

            <SubTitle>
              HORAIRES
            </SubTitle>

            <ChoiceList
              value={
                data.sleep_regularity
              }
              onChange={(v) =>
                set(
                  'sleep_regularity',
                  v
                )
              }
              options={[
                {
                  label:
                    'Très irréguliers',
                  value: 'irregular',
                },
                {
                  label:
                    'Assez réguliers',
                  value:
                    'mostly_regular',
                },
                {
                  label:
                    'Très réguliers',
                  value: 'regular',
                },
              ]}
            />

            {nav(
              !data.sleep_hours ||
                !data.sleep_quality ||
                !data.sleep_regularity
            )}
          </div>
        )}

        {step === 14 && (
          <div>
            <SectionTitle
              eyebrow="14 · RÉCUPÉRATION"
              title={
                <>
                  TON NIVEAU
                  <br />
                  DE CHARGE.
                </>
              }
              description="Stress et fatigue peuvent changer ce qui est récupérable, même avec un bon programme."
            />

            <SubTitle>
              STRESS HABITUEL
            </SubTitle>

            <ChoiceList
              value={
                data.stress_level
              }
              onChange={(v) =>
                set(
                  'stress_level',
                  v
                )
              }
              options={[
                {
                  label: 'Faible',
                  value: 'low',
                },
                {
                  label: 'Modéré',
                  value: 'moderate',
                },
                {
                  label: 'Élevé',
                  value: 'high',
                },
                {
                  label:
                    'Très élevé',
                  value: 'very_high',
                },
              ]}
            />

            <SubTitle>
              FATIGUE HABITUELLE
            </SubTitle>

            <ChoiceList
              value={
                data.usual_fatigue
              }
              onChange={(v) =>
                set(
                  'usual_fatigue',
                  v
                )
              }
              options={[
                {
                  label: 'Faible',
                  value: 'low',
                },
                {
                  label: 'Normale',
                  value: 'normal',
                },
                {
                  label:
                    'Souvent fatigué',
                  value: 'high',
                },
              ]}
            />

            <SubTitle>
              RÉCUPÉRATION ENTRE LES
              SÉANCES
            </SubTitle>

            <ChoiceList
              value={
                data.recovery_quality
              }
              onChange={(v) =>
                set(
                  'recovery_quality',
                  v
                )
              }
              options={[
                {
                  label: 'Difficile',
                  value: 'poor',
                },
                {
                  label: 'Correcte',
                  value: 'average',
                },
                {
                  label: 'Bonne',
                  value: 'good',
                },
              ]}
            />

            {nav(
              !data.stress_level ||
                !data.usual_fatigue ||
                !data.recovery_quality
            )}
          </div>
        )}

        {step === 15 && (
          <div>
            <SectionTitle
              eyebrow="15 · NUTRITION"
              title={
                <>
                  COMMENT TU
                  <br />
                  MANGES VRAIMENT.
                </>
              }
              description="Pas de régime imposé : Fuel part de tes habitudes et de tes préférences."
            />

            <SubTitle>
              TYPE D'ALIMENTATION
            </SubTitle>

            <ChoiceList
              value={data.diet_type}
              onChange={(v) =>
                set(
                  'diet_type',
                  v
                )
              }
              options={[
                {
                  label: 'Omnivore',
                },
                {
                  label:
                    'Végétarienne',
                },
                {
                  label:
                    'Végétalienne',
                },
                {
                  label: 'Autre',
                },
              ]}
            />

            <SubTitle>
              STRUCTURE ACTUELLE
            </SubTitle>

            <ChoiceList
              value={
                data.diet_description
              }
              onChange={(v) =>
                set(
                  'diet_description',
                  v
                )
              }
              options={[
                {
                  label:
                    'Très structurée',
                },
                {
                  label:
                    'Plutôt correcte',
                },
                {
                  label: 'Irrégulière',
                },
                {
                  label:
                    'Je ne sais pas vraiment',
                },
              ]}
            />

            <SubTitle optional>
              ALLERGIES, INTOLÉRANCES OU
              ALIMENTS EXCLUS
            </SubTitle>

            <TextArea
              value={
                data.dietary_exclusions
              }
              onChange={(v) =>
                set(
                  'dietary_exclusions',
                  v
                )
              }
              placeholder="Uniquement si tu souhaites les renseigner."
            />

            {nav(
              !data.diet_type ||
                !data.diet_description
            )}
          </div>
        )}

        {step === 16 && (
          <div>
            <SectionTitle
              eyebrow="16 · HABITUDES"
              title={
                <>
                  FUEL DOIT TENIR
                  <br />
                  DANS TA VIE.
                </>
              }
              description="Organisation, budget et difficulté principale permettent des recommandations plus réalistes."
            />

            <SubTitle>
              REPAS PAR JOUR
            </SubTitle>

            <ChoiceList
              value={
                data.meals_per_day
              }
              onChange={(v) =>
                set(
                  'meals_per_day',
                  v
                )
              }
              options={[
                2, 3, 4, 5,
              ].map((n) => ({
                label: `${n} repas`,
                value: String(n),
              }))}
            />

            <SubTitle>
              CUISINE
            </SubTitle>

            <ChoiceList
              value={
                data.cooking_frequency
              }
              onChange={(v) =>
                set(
                  'cooking_frequency',
                  v
                )
              }
              options={[
                {
                  label: 'Rarement',
                },
                {
                  label:
                    'Quelques fois par semaine',
                },
                {
                  label:
                    'Presque tous les jours',
                },
              ]}
            />

            <SubTitle>
              REPAS À L'EXTÉRIEUR
            </SubTitle>

            <ChoiceList
              value={
                data.eating_out_frequency
              }
              onChange={(v) =>
                set(
                  'eating_out_frequency',
                  v
                )
              }
              options={[
                {
                  label: 'Rarement',
                },
                {
                  label:
                    '1–2 fois / semaine',
                },
                {
                  label:
                    '3 fois ou plus / semaine',
                },
              ]}
            />

            <SubTitle optional>
              BUDGET ALIMENTAIRE
            </SubTitle>

            <ChoiceList
              value={
                data.food_budget
              }
              onChange={(v) =>
                set(
                  'food_budget',
                  v
                )
              }
              options={[
                {
                  label:
                    'Économique',
                },
                {
                  label: 'Modéré',
                },
                {
                  label: 'Flexible',
                },
                {
                  label:
                    'Je préfère ne pas répondre',
                },
              ]}
            />

            <SubTitle>
              SUIVI NUTRITIONNEL
            </SubTitle>

            <ChoiceList
              value={
                data.nutrition_tracking
              }
              onChange={(v) =>
                set(
                  'nutrition_tracking',
                  v
                )
              }
              options={[
                {
                  label:
                    'Je ne suis rien',
                },
                {
                  label: 'Je débute',
                },
                {
                  label:
                    'Je suis parfois calories/macros',
                },
                {
                  label:
                    'Je suis régulièrement mes macros',
                },
              ]}
            />

            <SubTitle>
              DIFFICULTÉ PRINCIPALE
            </SubTitle>

            <ChoiceList
              value={
                data.nutrition_challenge
              }
              onChange={(v) =>
                set(
                  'nutrition_challenge',
                  v
                )
              }
              options={[
                {
                  label: 'La faim',
                },
                {
                  label:
                    'Le grignotage',
                },
                {
                  label:
                    'Les portions',
                },
                {
                  label:
                    'Atteindre mes protéines',
                },
                {
                  label:
                    'Le manque de temps',
                },
                {
                  label:
                    'L’organisation',
                },
                {
                  label:
                    'Les repas à l’extérieur',
                },
                {
                  label:
                    'Rester régulier',
                },
              ]}
            />

            {nav(
              !data.meals_per_day ||
                !data.cooking_frequency ||
                !data.eating_out_frequency ||
                !data.nutrition_tracking ||
                !data.nutrition_challenge
            )}
          </div>
        )}

        {step === 17 && (
          <div>
            <SectionTitle
              eyebrow="17 · TON NOX"
              title={
                <>
                  ON A CE QU'IL
                  <br />
                  NOUS FAUT.
                </>
              }
              description="Derniers réglages : comment tu veux être accompagné, puis NOX construit ton plan."
            />

            <SubTitle optional>
              CARDIO PRÉFÉRÉ
            </SubTitle>

            <ChoiceList
              value={
                data.cardio_preference
              }
              onChange={(v) =>
                set(
                  'cardio_preference',
                  v
                )
              }
              options={[
                {
                  label: 'Marche',
                },
                {
                  label: 'Course',
                },
                {
                  label: 'Vélo',
                },
                {
                  label:
                    'Escaliers / stepper',
                },
                {
                  label: 'Rameur',
                },
                {
                  label:
                    'Pas de préférence',
                },
              ]}
            />

            <SubTitle optional>
              CARDIO ACTUEL
            </SubTitle>

            <ChoiceList
              value={
                data.cardio_frequency
              }
              onChange={(v) =>
                set(
                  'cardio_frequency',
                  v
                )
              }
              options={[
                {
                  label: 'Aucun',
                },
                {
                  label:
                    '1 fois / semaine',
                },
                {
                  label:
                    '2–3 fois / semaine',
                },
                {
                  label:
                    '4 fois ou plus / semaine',
                },
              ]}
            />

            <SubTitle>
              CE QUI TE FAIT LE PLUS
              SOUVENT DÉCROCHER
            </SubTitle>

            <ChoiceList
              value={
                data.dropout_reason
              }
              onChange={(v) =>
                set(
                  'dropout_reason',
                  v
                )
              }
              options={[
                {
                  label:
                    'Le manque de temps',
                  icon: Clock3,
                },
                {
                  label:
                    'La motivation',
                  icon: Flame,
                },
                {
                  label:
                    'Les résultats trop lents',
                  icon: Gauge,
                },
                {
                  label:
                    'L’alimentation',
                  icon: Utensils,
                },
                {
                  label:
                    'La fatigue',
                  icon: Moon,
                },
                {
                  label:
                    'Un plan trop compliqué',
                  icon: CircleHelp,
                },
              ]}
            />

            <SubTitle>
              STYLE DE COACHING
            </SubTitle>

            <ChoiceList
              value={
                data.coaching_style
              }
              onChange={(v) =>
                set(
                  'coaching_style',
                  v
                )
              }
              compact={false}
              options={[
                {
                  label:
                    'Encourageant',
                  value: 'supportive',
                  desc: 'Positif, rassurant, sans pression inutile',
                },
                {
                  label: 'Équilibré',
                  value: 'balanced',
                  desc: 'Clair, factuel et motivant',
                },
                {
                  label: 'Direct',
                  value: 'direct',
                  desc: 'Court, exigeant et orienté action',
                },
              ]}
            />

            <div
              style={{
                marginTop: 24,
                padding: 18,
                borderRadius: 20,
                border: `1px solid ${BORDER}`,
                background: '#FFF',
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  color: MUTED,
                  fontWeight: 900,
                  letterSpacing: '.08em',
                  marginBottom: 12,
                }}
              >
                NOX A COMPRIS
              </div>

              {[
                [
                  'Objectif',
                  data.goal,
                ],
                [
                  'Niveau',
                  data.experience_level,
                ],
                [
                  'Rythme',
                  `${
                    data.sessions_per_week ||
                    '—'
                  } séances · ${
                    data.session_length_min ||
                    '—'
                  } min`,
                ],
                [
                  'Lieu',
                  data.location,
                ],
                [
                  'Activité',
                  data.work_activity,
                ],
                [
                  'Sommeil',
                  data.sleep_hours
                    ? `${data.sleep_hours} h`
                    : '—',
                ],
                [
                  'Nutrition',
                  data.diet_type,
                ],
                [
                  'Coaching',
                  data.coaching_style,
                ],
              ].map(([k, v]) => (
                <div
                  key={k}
                  style={{
                    minHeight: 40,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent:
                      'space-between',
                    gap: 18,
                    borderBottom:
                      '1px solid #F1F1F1',
                  }}
                >
                  <span
                    style={{
                      color: '#888',
                      fontSize: 12,
                    }}
                  >
                    {k}
                  </span>

                  <b
                    style={{
                      fontSize: 12,
                      textAlign: 'right',
                    }}
                  >
                    {v || '—'}
                  </b>
                </div>
              ))}
            </div>

            {saveError && (
              <div
                role="alert"
                style={{
                  marginTop: 18,
                  padding:
                    '14px 16px',
                  borderRadius: 16,
                  background:
                    '#FFF3F2',
                  border:
                    '1px solid #FFD0CD',
                  color: '#D92D20',
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {saveError}
              </div>
            )}

            {nav(
              !data.dropout_reason ||
                !data.coaching_style,
              'CONSTRUIRE MON PLAN',
              finish
            )}

            <p
              style={{
                margin:
                  '17px auto 0',
                maxWidth: 390,
                textAlign: 'center',
                color: '#AAA',
                fontSize: 10,
                lineHeight: 1.5,
                fontWeight: 650,
              }}
            >
              NOX utilise ces
              informations pour
              personnaliser ton
              entraînement, ta nutrition
              et ton accompagnement. Les
              estimations évolueront
              ensuite avec tes données
              réelles.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
