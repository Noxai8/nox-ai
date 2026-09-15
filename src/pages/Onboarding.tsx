import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Building2,
  CalendarDays,
  Check,
  CircleHelp,
  Dumbbell,
  Flame,
  Footprints,
  Gauge,
  HeartPulse,
  House,
  MapPin,
  Monitor,
  RefreshCw,
  ShieldCheck,
  Shuffle,
  Sprout,
  Target,
  Trees,
  Trophy,
  Zap,
} from 'lucide-react';

import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';

const ACCENT = '#B7FF00';
const BLACK = '#0A0A0A';
const MUTED = '#777777';
const SURFACE = '#F7F7F7';
const BORDER = '#E8E8E8';

const TOTAL_STEPS = 5;

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
  compact?: boolean;
};

function ProgressBar({ step, total }: { step: number; total: number }) {
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
  compact = false,
}: OptionCardProps) {
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
        transition:
          'transform 150ms ease, border-color 150ms ease, background 150ms ease',
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
            color: BLACK,
          }}
        >
          <Icon size={compact ? 18 : 20} strokeWidth={2} />
        </span>
      )}

      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontSize: compact ? 13 : 14,
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
    <div style={{ marginBottom: 24 }}>
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

function SubTitle({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        margin: '26px 0 12px',
        fontSize: 10,
        color: MUTED,
        fontWeight: 900,
        letterSpacing: '0.09em',
      }}
    >
      {children}
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
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
  loading = false,
  children = 'CONTINUER',
}: {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  children?: ReactNode;
}) {
  const isDisabled = disabled || loading;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      style={{
        minHeight: 56,
        flex: 1,
        padding: '0 17px',
        border: 'none',
        borderRadius: 16,
        background: isDisabled ? '#EEEEEE' : ACCENT,
        color: isDisabled ? '#AAAAAA' : BLACK,
        fontSize: 12,
        fontWeight: 950,
        letterSpacing: '0.045em',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        boxShadow: isDisabled ? 'none' : '0 12px 28px rgba(183,255,0,.18)',
        transition: 'all 150ms ease',
      }}
    >
      <span>{loading ? 'CRÉATION EN COURS...' : children}</span>
      {!isDisabled && <ArrowRight size={18} strokeWidth={2.4} />}
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
          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(183,255,0,.18)';
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
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

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

  const next = () => {
    setSaveError('');
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const back = () => {
    setSaveError('');
    setStep((s) => Math.max(s - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const set = (key: string, val: any) =>
    setData((d: any) => ({
      ...d,
      [key]: val,
    }));

  const finish = async () => {
    if (!user || saving) return;

    setSaving(true);
    setSaveError('');

    try {
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: user.id,
        email: user.email,
        display_name: user.email?.split('@')[0],
        motivation: data.motivation,
        date_of_birth: data.date_of_birth || null,
        height_cm: Number(data.height_cm) || null,
        starting_weight_kg: Number(data.starting_weight_kg) || null,
        level: data.goal,
        experience_level: data.experience_level,
        equipment: data.equipment,
        available_days: data.available_days,
        session_length_min: Number(data.session_length_min) || 60,
        diet_description: data.diet_description,
        activity_level: data.activity_level,
        injuries: data.injuries,
        sex: data.sex,
        units: 'metric',
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      });

      if (profileError) throw profileError;

      const { error: goalError } = await supabase.from('goals').upsert({
        user_id: user.id,
        goal_type: data.goal,
        target_weight_kg: Number(data.target_weight) || null,
        target_date: data.target_date || null,
        sessions_per_week: Number(data.sessions_per_week) || 3,
        created_at: new Date().toISOString(),
      });

      if (goalError) throw goalError;

      navigate('/generate-program');
    } catch (error: any) {
      console.error('Onboarding save error:', error);
      setSaveError(
        error?.message ||
          'Impossible d’enregistrer ton profil pour le moment. Réessaie.'
      );
      setSaving(false);
    }
  };

  const nav = (
    disabled = false,
    onContinue = next,
    label: ReactNode = 'CONTINUER'
  ) => (
    <div style={{ display: 'flex', gap: 10, marginTop: 30 }}>
      {step > 1 && <BackButton onClick={back} />}
      <ContinueButton onClick={onContinue} disabled={disabled}>
        {label}
      </ContinueButton>
    </div>
  );

  const toggleDay = (day: string) => {
    const selected = data.available_days.includes(day);
    set(
      'available_days',
      selected
        ? data.available_days.filter((d: string) => d !== day)
        : [...data.available_days, day]
    );
  };

  const trajectory = (() => {
    if (!data.target_date) return null;

    const weeks = Math.round(
      (new Date(data.target_date).getTime() - Date.now()) /
        (7 * 24 * 3600 * 1000)
    );

    const diff = Math.abs(
      Number(data.starting_weight_kg) -
        Number(data.target_weight || data.starting_weight_kg)
    );

    const weeklyRate = weeks > 0 && diff > 0 ? diff / weeks : 0;

    let status = 'realistic';
    let msg = 'OBJECTIF RÉALISTE';
    let sub = 'Ta trajectoire semble cohérente.';

    if (weeklyRate > 1.2) {
      status = 'adjust';
      msg = 'OBJECTIF À AJUSTER';
      sub = 'Le rythme demandé semble très élevé.';
    } else if (weeklyRate > 0.8) {
      status = 'ambitious';
      msg = 'OBJECTIF AMBITIEUX';
      sub = 'La trajectoire demandera une forte régularité.';
    }

    return { weeks, status, msg, sub };
  })();

  return (
    <main
      style={{
        minHeight: '100dvh',
        background: '#FFFFFF',
        color: BLACK,
        position: 'relative',
        overflowX: 'hidden',
      }}
    >
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
          maxWidth: 560,
          margin: '0 auto',
          padding: '22px 20px 44px',
          boxSizing: 'border-box',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <header style={{ marginBottom: 32 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 22,
            }}
          >
            <div
              aria-label="NOX AI"
              style={{
                display: 'inline-flex',
                alignItems: 'baseline',
                gap: 6,
                color: BLACK,
                lineHeight: 1,
              }}
            >
              <span
                style={{
                  fontSize: 24,
                  fontWeight: 950,
                  letterSpacing: '-0.055em',
                }}
              >
                NOX
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 900,
                  letterSpacing: '0.12em',
                  color: '#777777',
                }}
              >
                AI
              </span>
            </div>

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

          <ProgressBar step={step} total={TOTAL_STEPS} />
        </header>

        {step === 1 && (
          <div>
            <SectionTitle
              eyebrow="01 · OBJECTIF & CORPS"
              title={
                <>
                  PARTONS DE
                  <br />
                  TOI.
                </>
              }
              description="Ton objectif et quelques données physiques suffisent pour poser les bases de ton plan."
            />

            <SubTitle>TON OBJECTIF PRINCIPAL</SubTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {[
                { label: 'Perdre du gras', icon: Flame },
                { label: 'Prendre du muscle', icon: Dumbbell },
                { label: 'Recomposition corporelle', icon: RefreshCw },
                { label: 'Devenir plus fort', icon: Trophy },
                { label: 'Améliorer mes performances', icon: Gauge },
                { label: 'Maintenir mon physique', icon: ShieldCheck },
              ].map((o) => (
                <OptionCard
                  key={o.label}
                  {...o}
                  compact
                  selected={data.goal === o.label}
                  onClick={() => set('goal', o.label)}
                />
              ))}
            </div>

            <SubTitle>TON PROFIL PHYSIQUE</SubTitle>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: 12,
              }}
            >
              <div style={{ gridColumn: '1 / -1' }}>
                <Field
                  label="Date de naissance"
                  value={data.date_of_birth}
                  onChange={(value) => set('date_of_birth', value)}
                  type="date"
                />
              </div>

              <Field
                label="Taille (cm)"
                value={data.height_cm}
                onChange={(value) => set('height_cm', value)}
                type="number"
                placeholder="178"
              />

              <Field
                label="Poids actuel (kg)"
                value={data.starting_weight_kg}
                onChange={(value) => set('starting_weight_kg', value)}
                type="number"
                placeholder="80"
              />

              {(data.goal === 'Perdre du gras' ||
                data.goal === 'Prendre du muscle') && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <Field
                    label="Poids cible (kg)"
                    value={data.target_weight}
                    onChange={(value) => set('target_weight', value)}
                    type="number"
                    placeholder="73"
                  />
                </div>
              )}
            </div>

            {nav(!data.goal)}
          </div>
        )}

        {step === 2 && (
          <div>
            <SectionTitle
              eyebrow="02 · EXPÉRIENCE"
              title={
                <>
                  TON NIVEAU.
                  <br />
                  TON TERRAIN.
                </>
              }
              description="NOX adapte la difficulté et les exercices à ton expérience et à l’endroit où tu t’entraînes."
            />

            <SubTitle>TON NIVEAU</SubTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
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
                  selected={data.experience_level === o.val}
                  onClick={() => set('experience_level', o.val)}
                />
              ))}
            </div>

            <SubTitle>OÙ T’ENTRAÎNES-TU ?</SubTitle>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: 9,
              }}
            >
              {[
                { label: 'Salle de sport', icon: Building2 },
                { label: 'Maison', icon: House },
                { label: 'Extérieur', icon: Trees },
                { label: 'Plusieurs lieux', icon: MapPin },
              ].map((o) => (
                <OptionCard
                  key={o.label}
                  {...o}
                  compact
                  selected={data.location === o.label}
                  onClick={() => set('location', o.label)}
                />
              ))}
            </div>

            {nav(!data.experience_level || !data.location)}
          </div>
        )}

        {step === 3 && (
          <div>
            <SectionTitle
              eyebrow="03 · DISPONIBILITÉS"
              title={
                <>
                  UN PLAN QUI
                  <br />
                  TIENT VRAIMENT.
                </>
              }
              description="Choisis un rythme réaliste. NOX construira la semaine autour de tes disponibilités."
            />

            <SubTitle>SÉANCES PAR SEMAINE</SubTitle>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
                gap: 8,
              }}
            >
              {[2, 3, 4, 5, 6].map((n) => {
                const selected = data.sessions_per_week === n;

                return (
                  <button
                    type="button"
                    key={n}
                    onClick={() => set('sessions_per_week', n)}
                    style={{
                      height: 56,
                      borderRadius: 16,
                      border: `1px solid ${selected ? BLACK : BORDER}`,
                      background: selected ? ACCENT : '#FFFFFF',
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

            <SubTitle>DURÉE PAR SÉANCE</SubTitle>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                gap: 8,
              }}
            >
              {[30, 45, 60, 75, 90].map((duration) => {
                const selected = data.session_length_min === duration;

                return (
                  <button
                    type="button"
                    key={duration}
                    onClick={() => set('session_length_min', duration)}
                    style={{
                      height: 52,
                      borderRadius: 15,
                      border: `1px solid ${selected ? BLACK : BORDER}`,
                      background: selected ? '#F7FFD9' : '#FFFFFF',
                      color: BLACK,
                      fontSize: 13,
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    {duration} min
                  </button>
                );
              })}
            </div>

            <SubTitle>JOURS DISPONIBLES</SubTitle>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: 9,
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
                const selected = data.available_days.includes(day);

                return (
                  <button
                    type="button"
                    key={day}
                    onClick={() => toggleDay(day)}
                    style={{
                      minHeight: 60,
                      padding: '0 13px',
                      borderRadius: 16,
                      border: `1.5px solid ${selected ? BLACK : BORDER}`,
                      background: selected ? '#F7FFD9' : '#FFFFFF',
                      color: BLACK,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ textAlign: 'left' }}>
                      <div
                        style={{
                          fontSize: 9,
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
                        width: 21,
                        height: 21,
                        borderRadius: '50%',
                        background: selected ? ACCENT : '#F4F4F4',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {selected && <Check size={12} strokeWidth={3} />}
                    </span>
                  </button>
                );
              })}
            </div>

            {nav(
              !data.sessions_per_week ||
                !data.session_length_min ||
                data.available_days.length === 0
            )}
          </div>
        )}

        {step === 4 && (
          <div>
            <SectionTitle
              eyebrow="04 · MODE DE VIE"
              title={
                <>
                  TA RÉALITÉ
                  <br />
                  AU QUOTIDIEN.
                </>
              }
              description="Quelques repères permettent à NOX d’ajuster la charge d’entraînement et la récupération."
            />

            <SubTitle>TON ALIMENTATION</SubTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {[
                { label: 'Très structurée', icon: BarChart3 },
                { label: 'Plutôt correcte', icon: Check },
                { label: 'Irrégulière', icon: Shuffle },
                { label: 'Je ne sais pas vraiment', icon: CircleHelp },
              ].map((o) => (
                <OptionCard
                  key={o.label}
                  {...o}
                  compact
                  selected={data.diet_description === o.label}
                  onClick={() => set('diet_description', o.label)}
                />
              ))}
            </div>

            <SubTitle>TON ACTIVITÉ HORS ENTRAÎNEMENT</SubTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
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
                { label: 'Actif', icon: Activity, val: 'active' },
                { label: 'Très actif', icon: Zap, val: 'very_active' },
              ].map((o) => (
                <OptionCard
                  key={o.val}
                  label={o.label}
                  icon={o.icon}
                  compact
                  selected={data.activity_level === o.val}
                  onClick={() => set('activity_level', o.val)}
                />
              ))}
            </div>

            <SubTitle>BLESSURES OU LIMITATIONS ?</SubTitle>
            <div
              style={{
                padding: '14px 15px',
                borderRadius: 17,
                background: '#F7F7F7',
                border: `1px solid ${BORDER}`,
                display: 'flex',
                gap: 11,
                marginBottom: 12,
              }}
            >
              <HeartPulse size={20} strokeWidth={2} />
              <p
                style={{
                  margin: 0,
                  color: MUTED,
                  fontSize: 12,
                  lineHeight: 1.5,
                }}
              >
                Indique uniquement ce qui peut influencer ton entraînement.
              </p>
            </div>

            <textarea
              value={data.injuries}
              onChange={(e) => set('injuries', e.target.value)}
              rows={4}
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
                e.currentTarget.style.borderColor = BLACK;
                e.currentTarget.style.boxShadow =
                  '0 0 0 3px rgba(183,255,0,.18)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = BORDER;
                e.currentTarget.style.boxShadow = 'none';
              }}
            />

            {nav(!data.diet_description || !data.activity_level)}
          </div>
        )}

        {step === 5 && (
          <div>
            <SectionTitle
              eyebrow="05 · TRAJECTOIRE"
              title={
                <>
                  TON OBJECTIF
                  <br />
                  NOX.
                </>
              }
              description="Dernière étape : fixe ta date cible et vérifie le profil utilisé pour construire ton programme."
            />

            <Field
              label="Date cible"
              value={data.target_date}
              onChange={(value) => set('target_date', value)}
              type="date"
              min={new Date().toISOString().split('T')[0]}
            />

            {trajectory && (
              <div
                style={{
                  marginTop: 16,
                  padding: '17px',
                  borderRadius: 18,
                  background:
                    trajectory.status === 'realistic' ? '#F7FFD9' : '#F8F8F8',
                  border: `1px solid ${
                    trajectory.status === 'realistic' ? '#DDF7A0' : BORDER
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
                        trajectory.status === 'realistic' ? ACCENT : '#EEEEEE',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {trajectory.status === 'realistic' ? (
                      <Check size={20} strokeWidth={2.5} />
                    ) : trajectory.status === 'ambitious' ? (
                      <Gauge size={20} strokeWidth={2} />
                    ) : (
                      <Target size={20} strokeWidth={2} />
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
                      {trajectory.msg}
                    </div>
                    <div
                      style={{
                        marginTop: 3,
                        fontSize: 11,
                        lineHeight: 1.45,
                        color: MUTED,
                      }}
                    >
                      {trajectory.sub}
                    </div>
                  </div>
                </div>

                {trajectory.weeks > 0 && (
                  <div
                    style={{
                      marginTop: 14,
                      paddingTop: 13,
                      borderTop: '1px solid rgba(0,0,0,.07)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 7,
                      color: MUTED,
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    <CalendarDays size={15} strokeWidth={2} />
                    {trajectory.weeks} semaines jusqu’à l’objectif
                  </div>
                )}
              </div>
            )}

            <SubTitle>RÉSUMÉ DE TON PLAN</SubTitle>
            <div
              style={{
                borderRadius: 20,
                padding: '5px 18px',
                border: `1px solid ${BORDER}`,
                background: '#FFFFFF',
                boxShadow: '0 12px 35px rgba(0,0,0,.04)',
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
                  data.target_weight ? `${data.target_weight} kg` : '—',
                ],
                ['Niveau', data.experience_level || '—'],
                ['Lieu', data.location || '—'],
                ['Séances / semaine', data.sessions_per_week || '—'],
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
              ].map(([key, value], index, array) => (
                <div
                  key={String(key)}
                  style={{
                    minHeight: 50,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 18,
                    borderBottom:
                      index === array.length - 1
                        ? 'none'
                        : '1px solid #F0F0F0',
                  }}
                >
                  <span
                    style={{
                      color: '#888888',
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {key}
                  </span>
                  <span
                    style={{
                      color: BLACK,
                      fontSize: 12,
                      fontWeight: 850,
                      textAlign: 'right',
                    }}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>

            {saveError && (
              <div
                role="alert"
                style={{
                  marginTop: 18,
                  padding: '14px 16px',
                  borderRadius: 16,
                  background: '#FFF3F2',
                  border: '1px solid #FFD0CD',
                  color: '#D92D20',
                  fontSize: 12,
                  lineHeight: 1.5,
                  fontWeight: 700,
                }}
              >
                {saveError}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 26 }}>
              <BackButton onClick={back} />
              <ContinueButton
                onClick={finish}
                disabled={!data.target_date}
                loading={saving}
              >
                CONSTRUIRE MON PLAN
              </ContinueButton>
            </div>

            <p
              style={{
                margin: '17px auto 0',
                maxWidth: 350,
                textAlign: 'center',
                color: '#AAAAAA',
                fontSize: 10,
                lineHeight: 1.5,
                fontWeight: 650,
              }}
            >
              NOX AI utilise ces informations pour personnaliser ton
              entraînement et ta progression.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
