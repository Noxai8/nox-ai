import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity, Camera, ChevronRight, CircleUserRound, Droplets,
  Dumbbell, FileText, Moon, Plus, Scale, Smile, Utensils, X,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { generateDailyPriority, type DailyPriority } from '../lib/nox/priorityEngine';
import { todayLocalDate } from '../lib/localDate';
import NoxCompanion from '../components/NoxCompanion';

type Completion = 'yes' | 'partial' | 'no';
type NavActive = 'home' | 'nutrition' | 'mon-nox' | 'moi';

type Closure = {
  completion: Completion;
  evening_energy: number | null;
  priority_type: string;
};

const completionLabel: Record<Completion, string> = {
  yes: 'Oui',
  partial: 'En partie',
  no: 'Non',
};

function NoxOrb({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`nox-orb ${compact ? 'nox-orb--compact' : ''}`} aria-hidden="true">
      <div className="nox-orb__ring nox-orb__ring--one" />
      <div className="nox-orb__ring nox-orb__ring--two" />
      <div className="nox-orb__ring nox-orb__ring--three" />
      <div className="nox-orb__core" />
    </div>
  );
}

function QuickAddModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  if (!open) return null;

  const actions = [
    { label: 'Repas',           icon: Utensils, path: '/food-scan', color: '#FF6B35' },
    { label: 'Mouvement/Sport', icon: Dumbbell, path: '/movement',  color: '#C8FF00' },
    { label: 'Poids',           icon: Scale,    path: '/body',      color: '#64B5F6' },
    { label: 'Sommeil',         icon: Moon,     path: '/sleep',     color: '#9C89FF' },
    { label: 'Humeur/Stress',   icon: Smile,    path: '/mood',      color: '#FFD93D' },
    { label: 'Eau',             icon: Droplets, path: '/fuel',      color: '#4FC3F7' },
    { label: 'Note rapide',     icon: FileText, path: '/coach',     color: '#A5D6A7' },
    { label: 'Photo',           icon: Camera,   path: '/mon-nox',   color: '#F48FB1' },
  ];

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        background: 'rgba(0,0,0,.72)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        padding: '0 12px',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Ajouter"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 620,
          maxHeight: '86dvh',
          overflowY: 'auto',
          boxSizing: 'border-box',
          background: '#111111',
          border: '1px solid #262626',
          borderRadius: '28px 28px 0 0',
          padding: '10px 20px calc(24px + env(safe-area-inset-bottom))',
          boxShadow: '0 -24px 80px rgba(0,0,0,.55)',
        }}
      >
        <div style={{ width: 42, height: 4, borderRadius: 999, background: '#3A3A3A', margin: '0 auto 18px' }} />
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.12em', color: '#777777', marginBottom: 6 }}>AJOUTER</div>
            <h2 style={{ margin: 0, fontSize: 26, lineHeight: 1.05, fontWeight: 1000, letterSpacing: '-.03em', color: '#FFFFFF' }}>
              Qu'est-ce qui vient de se passer ?
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            style={{
              flex: '0 0 auto',
              width: 40,
              height: 40,
              display: 'grid',
              placeItems: 'center',
              borderRadius: 14,
              border: '1px solid #2A2A2A',
              background: '#1A1A1A',
              color: '#FFFFFF',
              cursor: 'pointer',
            }}
          >
            <X size={19} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10, paddingTop: 20 }}>
          {actions.map(({ label, icon: Icon, path, color }) => (
            <button
              key={label}
              onClick={() => { onClose(); navigate(path); }}
              style={{
                minWidth: 0,
                minHeight: 104,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 9,
                padding: '14px 6px',
                border: '1px solid #242424',
                borderRadius: 18,
                background: '#1A1A1A',
                cursor: 'pointer',
                color: '#FFFFFF',
              }}
            >
              <span style={{ width: 44, height: 44, borderRadius: 14, background: `${color}22`, display: 'grid', placeItems: 'center' }}>
                <Icon size={21} color={color} strokeWidth={2} />
              </span>
              <span style={{ maxWidth: '100%', fontSize: 10, fontWeight: 800, color: '#AAAAAA', textAlign: 'center', lineHeight: 1.25 }}>
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function BottomNav({ active }: { active: NavActive | string }) {
  const navigate = useNavigate();
  const [showAdd, setShowAdd] = useState(false);

  const tabs = [
    { id: 'home', label: "Aujourd'hui", path: '/home', icon: Activity },
    { id: 'nutrition', label: 'Nutrition', path: '/fuel', icon: Utensils },
    { id: 'plus', label: '', path: '', icon: Plus },
    { id: 'mon-nox', label: 'Mon NOX', path: '/mon-nox', icon: CircleUserRound },
    { id: 'moi', label: 'Moi', path: '/profile', icon: CircleUserRound },
  ];

  return (
    <>
      <QuickAddModal open={showAdd} onClose={() => setShowAdd(false)} />
      <nav
        aria-label="Navigation principale"
        style={{
          position: 'fixed',
          left: '50%',
          bottom: 0,
          transform: 'translateX(-50%)',
          zIndex: 900,
          width: 'min(100%, 620px)',
          boxSizing: 'border-box',
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          alignItems: 'end',
          gap: 2,
          padding: '8px 10px calc(8px + env(safe-area-inset-bottom))',
          background: 'rgba(10,10,10,.96)',
          borderTop: '1px solid #242424',
          boxShadow: '0 -12px 40px rgba(0,0,0,.35)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
        }}
      >
        {tabs.map((tab) => {
          if (tab.id === 'plus') {
            return (
              <button
                key="plus"
                onClick={() => setShowAdd(true)}
                aria-label="Ajouter"
                style={{
                  width: 52,
                  height: 52,
                  justifySelf: 'center',
                  alignSelf: 'center',
                  display: 'grid',
                  placeItems: 'center',
                  marginTop: -24,
                  borderRadius: 18,
                  border: '1px solid #D7FF45',
                  background: '#C8FF00',
                  color: '#0A0A0A',
                  cursor: 'pointer',
                  boxShadow: '0 10px 28px rgba(200,255,0,.18)',
                }}
              >
                <Plus size={25} strokeWidth={3} />
              </button>
            );
          }

          const Icon = tab.icon;
          const selected = active === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              aria-current={selected ? 'page' : undefined}
              style={{
                minWidth: 0,
                minHeight: 52,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                padding: '5px 2px',
                border: 0,
                background: 'transparent',
                color: selected ? '#C8FF00' : '#777777',
                cursor: 'pointer',
              }}
            >
              <Icon size={19} strokeWidth={selected ? 2.5 : 2} />
              <span style={{ fontSize: 9, lineHeight: 1, fontWeight: selected ? 900 : 700, whiteSpace: 'nowrap' }}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
}

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<any>(null);
  const [program, setProgram] = useState<any>(null);
  const [targets, setTargets] = useState<any>(null);
  const [todayFood, setTodayFood] = useState<any[]>([]);
  const [todayWorkout, setTodayWorkout] = useState<any>(null);
  const [todayPulse, setTodayPulse] = useState<any>(null);
  const [todayClosure, setTodayClosure] = useState<Closure | null>(null);
  const [daysSinceActivity, setDaysSinceActivity] = useState<number | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [savingClosure, setSavingClosure] = useState(false);
  const [editingClosure, setEditingClosure] = useState(false);
  const [observedDays, setObservedDays] = useState(0);

  useEffect(() => { if (user) void loadAll(); }, [user]);

  const loadAll = async () => {
    if (!user) return;

    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();

    const [{ data: prof }, { data: prog }, { data: tgts }, { data: food }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
      supabase.from('workout_programs').select('*').eq('user_id', user.id).eq('is_active', true).maybeSingle(),
      supabase.from('nutrition_targets').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('food_entries').select('calories, protein').eq('user_id', user.id).gte('created_at', start).lte('created_at', end),
    ]);

    setProfile(prof);
    setProgram(prog);
    setTargets(tgts);
    setTodayFood(food || []);

    const [{ data: workout }, { data: lastActivity }, { data: pulse }, { data: closure }] = await Promise.all([
      supabase
        .from('workouts')
        .select('id, name, status, finished_at, duration_minutes, session_feedback')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .gte('finished_at', start)
        .lte('finished_at', end)
        .order('finished_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('workouts')
        .select('finished_at')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .not('finished_at', 'is', null)
        .order('finished_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('daily_pulses')
        .select('sleep_score, energy_score, body_score')
        .eq('user_id', user.id)
        .eq('date', todayLocalDate())
        .maybeSingle(),
      supabase
        .from('daily_closures')
        .select('completion, evening_energy, priority_type')
        .eq('user_id', user.id)
        .eq('date', todayLocalDate())
        .maybeSingle(),
    ]);

    setTodayWorkout(workout || null);
    setTodayPulse(pulse || null);
    setTodayClosure((closure as Closure) || null);

    const { count: observedDaysCount, error: observedDaysError } = await supabase
      .from('daily_closures')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (observedDaysError) {
      console.error('daily_closures count:', observedDaysError);
    } else {
      setObservedDays(observedDaysCount ?? 0);
    }

    if (lastActivity?.finished_at) {
      const last = new Date(lastActivity.finished_at);
      const dayNumber = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000;
      setDaysSinceActivity(Math.max(0, dayNumber(new Date()) - dayNumber(last)));
    } else {
      setDaysSinceActivity(null);
    }
  };

  const firstName = profile?.first_name || profile?.display_name?.split(' ')[0] || '';
  const caloriesTarget = Number(targets?.calories || 2200);
  const proteinTarget = Number(targets?.protein_g || targets?.protein || 160);
  const todayKcal = todayFood.reduce((sum, entry) => sum + Number(entry.calories || 0), 0);
  const todayProt = todayFood.reduce((sum, entry) => sum + Number(entry.protein || 0), 0);
  const sessions = program?.program_json?.sessions || [];
  const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  const todaySession = sessions.find((session: any) =>
    String(session?.day || '').toLowerCase().includes(dayNames[new Date().getDay()].toLowerCase().slice(0, 3))
  ) || null;

  const priority: DailyPriority = useMemo(() => generateDailyPriority({
    pulse: todayPulse ? {
      sleep_score: Number(todayPulse.sleep_score),
      energy_score: Number(todayPulse.energy_score),
      body_score: Number(todayPulse.body_score),
    } : null,
    profile: { goal_type: profile?.goal_type ?? null },
    recentActivity: {
      session_planned_today: Boolean(todaySession) && !Boolean(todayWorkout),
      last_session_feedback: todayWorkout?.session_feedback === 'hard'
        ? 'hard'
        : todayWorkout?.session_feedback === 'easy'
          ? 'easy'
          : todayWorkout?.session_feedback
            ? 'good'
            : null,
      days_since_last_session: daysSinceActivity,
    },
    nutrition: {
      protein_logged: Math.round(todayProt),
      protein_target: proteinTarget,
      calories_logged: Math.round(todayKcal),
      calories_target: caloriesTarget,
      days_logged_last_7: todayFood.length > 0 ? 1 : 0,
    },
    context: {
      localDate: todayLocalDate(),
      localHour: new Date().getHours(),
    },
  }), [todayPulse, profile, todaySession, todayWorkout, daysSinceActivity, todayProt, proteinTarget, todayKcal, caloriesTarget, todayFood.length]);

  const dateLabel = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  }).format(new Date()).toUpperCase();

  const saveClosure = async (completion: Completion, eveningEnergy: number | null = todayClosure?.evening_energy ?? null) => {
    if (!user || savingClosure) return;
    setSavingClosure(true);

    const payload = {
      user_id: user.id,
      date: todayLocalDate(),
      priority_type: priority.type,
      completion,
      evening_energy: eveningEnergy,
    };

    const { error } = await supabase.from('daily_closures').upsert(payload, { onConflict: 'user_id,date' });
    if (!error) {
      setTodayClosure({ completion, evening_energy: eveningEnergy, priority_type: priority.type });
      setEditingClosure(false);
    } else {
      console.error('daily_closures upsert:', error);
    }
    setSavingClosure(false);
  };

  const saveEnergy = async (value: number) => {
    if (!todayClosure) return;
    await saveClosure(todayClosure.completion, value);
  };

  const priorityTitle = priority.type === 'none' ? 'Continue normalement.' : priority.title;
  const priorityAction = priority.type === 'none' ? priority.reason : priority.action;
  const priorityReason = priority.type === 'none'
    ? "Tes signaux ne donnent pas à NOX de raison suffisamment solide de modifier ta journée."
    : priority.reason;

  const mainAction = () => {
    if (priority.type === 'nutrition') navigate('/food-scan');
    else if (priority.type === 'activity') navigate('/program');
  };

  const actionLabel =
    priority.type === 'nutrition' ? 'AJOUTER MON REPAS'
      : priority.type === 'activity' ? 'COMMENCER MA SÉANCE'
        : null;

  return (
    <div style={{
      minHeight: '100dvh',
      background: '#090B0A',
      color: '#FFFFFF',
      paddingBottom: 'calc(118px + env(safe-area-inset-bottom))',
    }}>
      <main
        className="nox-home-main"
        style={{
          width: '100%',
          margin: '0 auto',
          padding: '0 18px',
          boxSizing: 'border-box',
        }}
      >

        {/* AUJOURD'HUI */}
        <header style={{ paddingTop: 48, paddingBottom: 26 }}>
          <div style={{
            color: '#777C79',
            fontSize: 13,
            fontWeight: 850,
            letterSpacing: '.055em',
            textTransform: 'uppercase',
            marginBottom: 8,
          }}>
            {dateLabel}
          </div>
          <h1 style={{
            margin: 0,
            fontSize: 40,
            lineHeight: .98,
            letterSpacing: '-.05em',
            fontWeight: 1000,
          }}>
            Aujourd’hui
          </h1>
          <div style={{
            marginTop: 8,
            color: '#B2B6B3',
            fontSize: 14,
            fontWeight: 650,
          }}>
            {firstName ? `Bonjour ${firstName} 👋` : 'Bonjour 👋'}
          </div>
        </header>

        {/* TON PULSE */}
        <section style={{ marginBottom: 34 }}>
          <SectionHeader
            title="Ton Pulse"
            action={todayPulse ? 'Modifier' : 'Commencer'}
            onAction={() => navigate('/pulse')}
          />

          {todayPulse ? (
            <AppCard>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                minHeight: 132,
              }}>
                {[
                  ['🌙', 'Sommeil', todayPulse.sleep_score],
                  ['⚡', 'Énergie', todayPulse.energy_score],
                  ['💪', 'Corps', todayPulse.body_score],
                ].map(([emoji, label, value], index) => (
                  <div
                    key={String(label)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderLeft: index ? '1px solid #4A4E4B' : undefined,
                    }}
                  >
                    <div style={{ fontSize: 25, lineHeight: 1, marginBottom: 10 }}>{emoji}</div>
                    <div style={{ fontSize: 31, lineHeight: 1, fontWeight: 1000 }}>
                      {value}
                      <span style={{ color: '#777C79', fontSize: 13, fontWeight: 800 }}>/5</span>
                    </div>
                    <div style={{
                      marginTop: 9,
                      color: '#C1C4C2',
                      fontSize: 12,
                      fontWeight: 700,
                    }}>
                      {label}
                    </div>
                  </div>
                ))}
              </div>
            </AppCard>
          ) : (
            <AppCard style={{ padding: 22 }}>
              <div style={{ fontSize: 21, fontWeight: 1000, marginBottom: 7 }}>
                Comment tu vas aujourd’hui ?
              </div>
              <div style={{ color: '#B3B7B4', fontSize: 14, lineHeight: 1.45, marginBottom: 20 }}>
                Sommeil, énergie et état du corps. Quelques secondes pour donner du contexte à NOX.
              </div>
              <LimeButton onClick={() => navigate('/pulse')}>FAIRE MON PULSE →</LimeButton>
            </AppCard>
          )}
        </section>

        {/* PRIORITÉ */}
        <section style={{ marginBottom: 34 }}>
          <SectionHeader
            title="Priorité du jour"
            action={todayPulse
              ? priority.confidence === 'high'
                ? 'Élevée'
                : priority.confidence === 'moderate'
                  ? 'Modérée'
                  : 'Faible'
              : undefined}
          />

          <AppCard style={{ padding: 22 }}>
            {!todayPulse ? (
              <>
                <div style={ui.bigTitle}>À préciser avec ton Pulse</div>
                <div style={ui.body}>
                  NOX attend tes trois signaux du matin avant de fixer la priorité de ta journée.
                </div>
              </>
            ) : priority.type === 'none' ? (
              <>
                <div style={ui.bigTitle}>Tout va bien ✓</div>
                <div style={ui.body}>
                  NOX n’a pas de signal suffisant pour te demander de modifier quelque chose aujourd’hui.
                </div>
              </>
            ) : (
              <>
                <div style={{
                  display: 'inline-flex',
                  padding: '7px 10px',
                  borderRadius: 999,
                  background: 'rgba(200,255,0,.12)',
                  color: '#C8FF00',
                  fontSize: 10,
                  fontWeight: 950,
                  letterSpacing: '.05em',
                  marginBottom: 15,
                }}>
                  NOX RECOMMANDE
                </div>
                <div style={ui.bigTitle}>{(priority as any).title}</div>
                <div style={ui.body}>{(priority as any).action}</div>
              </>
            )}

            {todayPulse && (
              <details style={{
                marginTop: 21,
                paddingTop: 17,
                borderTop: '1px solid #4A4E4B',
              }}>
                <summary style={{
                  cursor: 'pointer',
                  color: '#C8FF00',
                  fontSize: 12,
                  fontWeight: 900,
                  userSelect: 'none',
                }}>
                  Pourquoi ? ›
                </summary>
                <div style={{ marginTop: 12, color: '#B3B7B4', fontSize: 13, lineHeight: 1.5 }}>
                  {priority.type !== 'none'
                    ? (priority as any).reason
                    : 'Tes signaux du matin sont équilibrés — aucune zone ne nécessite d’intervention aujourd’hui.'}
                </div>
                {priority.evidence.length > 0 && (
                  <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
                    {priority.evidence.map(ev => (
                      <div key={ev.key} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 12,
                        padding: '10px 12px',
                        borderRadius: 12,
                        background: '#1A1D1B',
                      }}>
                        <span style={{ color: '#8E938F', fontSize: 11 }}>{ev.label}</span>
                        <span style={{ fontSize: 11, fontWeight: 900 }}>{ev.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </details>
            )}

            {todayPulse && priority.type === 'activity' && todaySession && (
              <LimeButton onClick={() => navigate('/program')} style={{ marginTop: 21 }}>
                COMMENCER MA SÉANCE →
              </LimeButton>
            )}

            {todayPulse && priority.type === 'nutrition' && (
              <LimeButton onClick={() => navigate('/fuel')} style={{ marginTop: 21 }}>
                AJOUTER MON REPAS →
              </LimeButton>
            )}
          </AppCard>
        </section>

        {/* MOUVEMENT */}
        {todaySession && !todayWorkout && (
          <section style={{ marginBottom: 34 }}>
            <SectionHeader title="Mouvement" action="Plus" onAction={() => navigate('/program')} />
            <AppCard style={{ padding: 22 }}>
              <div style={{ color: '#8E938F', fontSize: 11, fontWeight: 900, letterSpacing: '.06em', marginBottom: 8 }}>
                SÉANCE DU JOUR
              </div>
              <div style={ui.bigTitle}>{todaySession.name}</div>
              {todaySession.duration_minutes && (
                <div style={{ ...ui.body, marginBottom: 20 }}>
                  {todaySession.duration_minutes} min · {todaySession.exercises?.length ?? 0} exercices
                </div>
              )}
              <DarkButton onClick={() => navigate('/program')}>VOIR MA SÉANCE →</DarkButton>
            </AppCard>
          </section>
        )}

        {todayWorkout && (
          <section style={{ marginBottom: 34 }}>
            <SectionHeader title="Mouvement" />
            <AppCard style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: 15,
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
                background: 'rgba(200,255,0,.12)',
                color: '#C8FF00',
                fontSize: 19,
                fontWeight: 1000,
              }}>✓</div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 950 }}>Séance terminée</div>
                <div style={{ color: '#B3B7B4', fontSize: 13, marginTop: 3 }}>{todayWorkout.name}</div>
              </div>
            </AppCard>
          </section>
        )}

        {/* NUTRITION */}
        {(todayKcal > 0 || todayProt > 0) && (
          <section style={{ marginBottom: 34 }}>
            <SectionHeader title="Nutrition" action="Plus" onAction={() => navigate('/fuel')} />
            <AppCard style={{ padding: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Metric
                  value={Math.round(todayKcal)}
                  label={`kcal${caloriesTarget ? ` / ${caloriesTarget}` : ''}`}
                  progress={caloriesTarget > 0 ? todayKcal / caloriesTarget : 0}
                />
                <Metric
                  value={`${Math.round(todayProt)}g`}
                  label={`protéines${proteinTarget ? ` / ${proteinTarget}g` : ''}`}
                  progress={proteinTarget > 0 ? todayProt / proteinTarget : 0}
                />
              </div>
            </AppCard>
          </section>
        )}

        {/* CLÔTURE */}
        {!todayClosure ? (
          <section style={{ marginBottom: 28 }}>
            <SectionHeader title="Clôture de journée" />
            <AppCard style={{ padding: 22 }}>
              <div style={ui.bigTitle}>
                {todayPulse ? 'Ta journée touche à sa fin.' : 'Ton bilan viendra ici ce soir.'}
              </div>
              <div style={{ ...ui.body, marginBottom: todayPulse ? 20 : 0 }}>
                {todayPulse
                  ? '30 secondes pour clôturer avec NOX.'
                  : 'Commence par ton Pulse pour donner à NOX le contexte de ta journée.'}
              </div>
              {todayPulse && (
                <DarkButton
                  onClick={() => navigate('/closure', {
                    state: {
                      priorityTitle: priority.type !== 'none' ? (priority as any).title : null,
                      priorityType: priority.type,
                    },
                  })}
                >
                  CLÔTURER MA JOURNÉE →
                </DarkButton>
              )}
            </AppCard>
          </section>
        ) : (
          <section style={{ marginBottom: 28 }}>
            <SectionHeader title="Clôture de journée" />
            <AppCard style={{ padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
              <div>
                <div style={{ color: '#C8FF00', fontSize: 13, fontWeight: 950 }}>Journée clôturée ✓</div>
                <div style={{ color: '#B3B7B4', fontSize: 12, marginTop: 4 }}>NOX a enregistré ta journée.</div>
              </div>
              <button
                onClick={() => setEditingClosure(true)}
                style={{ border: 0, background: 'transparent', color: '#C8FF00', fontSize: 12, fontWeight: 900, cursor: 'pointer' }}
              >
                Modifier
              </button>
            </AppCard>
          </section>
        )}
      </main>

      <BottomNav active="home" />

      <style>{`
        .nox-home-main {
          max-width: 760px;
        }

        @media (max-width: 640px) {
          .nox-home-main {
            max-width: none;
            padding-left: 16px !important;
            padding-right: 16px !important;
          }
        }

        @media (min-width: 641px) and (max-width: 900px) {
          .nox-home-main {
            max-width: 680px;
          }
        }

        @media (min-width: 1100px) {
          .nox-home-main {
            max-width: 760px;
          }
        }
      `}</style>
    </div>
  );
}

/* Visuel de l'écran Aujourd'hui uniquement. La BottomNav reste celle de NOX. */

const ui = {
  bigTitle: {
    marginBottom: 8,
    color: '#FFFFFF',
    fontSize: 23,
    lineHeight: 1.08,
    letterSpacing: '-.035em',
    fontWeight: 1000,
  } as React.CSSProperties,
  body: {
    color: '#B3B7B4',
    fontSize: 14,
    lineHeight: 1.5,
  } as React.CSSProperties,
};

function SectionHeader({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div style={{
      minHeight: 34,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 14,
      marginBottom: 12,
    }}>
      <h2 style={{
        margin: 0,
        color: '#FFFFFF',
        fontSize: 27,
        lineHeight: 1,
        letterSpacing: '-.04em',
        fontWeight: 1000,
      }}>
        {title}
      </h2>

      {action && (
        onAction ? (
          <button
            onClick={onAction}
            style={{
              border: 0,
              padding: 0,
              background: 'transparent',
              color: '#C8FF00',
              fontSize: 13,
              fontWeight: 900,
              cursor: 'pointer',
            }}
          >
            {action}
          </button>
        ) : (
          <span style={{
            color: '#C8FF00',
            fontSize: 11,
            fontWeight: 900,
            textTransform: 'uppercase',
          }}>
            {action}
          </span>
        )
      )}
    </div>
  );
}

function AppCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div style={{
      overflow: 'hidden',
      background: '#252826',
      border: '2px solid #5B605C',
      borderRadius: 22,
      boxSizing: 'border-box',
      ...style,
    }}>
      {children}
    </div>
  );
}

function LimeButton({
  children,
  onClick,
  style,
}: {
  children: React.ReactNode;
  onClick: () => void;
  style?: React.CSSProperties;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        minHeight: 54,
        border: 0,
        borderRadius: 16,
        background: '#C8FF00',
        color: '#080A09',
        fontSize: 13,
        fontWeight: 1000,
        cursor: 'pointer',
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function DarkButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        minHeight: 52,
        border: '1.5px solid #606561',
        borderRadius: 15,
        background: '#303330',
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: 950,
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}

function Metric({
  value,
  label,
  progress,
}: {
  value: string | number;
  label: string;
  progress: number;
}) {
  return (
    <div style={{
      minWidth: 0,
      padding: '17px 14px',
      borderRadius: 16,
      background: '#303330',
    }}>
      <div style={{ fontSize: 25, lineHeight: 1, fontWeight: 1000 }}>{value}</div>
      <div style={{
        marginTop: 6,
        color: '#B3B7B4',
        fontSize: 11,
        fontWeight: 700,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>
        {label}
      </div>
      {progress > 0 && (
        <div style={{ height: 5, marginTop: 13, overflow: 'hidden', borderRadius: 999, background: '#555A56' }}>
          <div style={{
            width: `${Math.min(100, Math.max(0, progress * 100))}%`,
            height: '100%',
            borderRadius: 999,
            background: '#C8FF00',
          }} />
        </div>
      )}
    </div>
  );
}
