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
    { label: 'Repas',           icon: Utensils,  path: '/food-scan', color: '#FF6B35' },
    { label: 'Mouvement/Sport', icon: Dumbbell,  path: '/movement',  color: '#C8FF00' },
    { label: 'Poids',           icon: Scale,     path: '/body',      color: '#64B5F6' },
    { label: 'Sommeil',         icon: Moon,      path: '/sleep',     color: '#9C89FF' },
    { label: 'Humeur/Stress',   icon: Smile,     path: '/mood',      color: '#FFD93D' },
    { label: 'Eau',             icon: Droplets,  path: '/fuel',      color: '#4FC3F7' },
    { label: 'Note rapide',     icon: FileText,  path: '/coach',     color: '#A5D6A7' },
    { label: 'Photo',           icon: Camera,    path: '/mon-nox',   color: '#F48FB1' },
  ];

  return (
    <div className="nox-modal-backdrop" onClick={onClose}>
      <div className="nox-modal" onClick={(e) => e.stopPropagation()} style={{ paddingBottom: 32 }}>
        <div className="nox-modal__handle" />
        <div className="nox-modal__header">
          <div>
            <div className="nox-eyebrow">AJOUTER</div>
            <h2 style={{ margin: 0, fontSize: 26, fontWeight: 1000, letterSpacing: '-.03em' }}>Qu'est-ce qui vient de se passer ?</h2>
          </div>
          <button className="nox-icon-button" onClick={onClose} aria-label="Fermer"><X size={19} /></button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, padding: '20px 0 0' }}>
          {actions.map(({ label, icon: Icon, path, color }) => (
            <button key={label} onClick={() => { onClose(); navigate(path); }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '16px 8px', border: 0, borderRadius: 20, background: '#1A1A1A', cursor: 'pointer', color: '#FFFFFF' }}>
              <span style={{ width: 48, height: 48, borderRadius: 16, background: `${color}22`, display: 'grid', placeItems: 'center' }}>
                <Icon size={22} color={color} strokeWidth={2} />
              </span>
              <span style={{ fontSize: 10, fontWeight: 800, color: '#AAAAAA', textAlign: 'center', lineHeight: 1.3 }}>{label}</span>
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
    { id: 'home', label: "Aujourd'hui", path: '/home' },
    { id: 'nutrition', label: 'Nutrition', path: '/fuel' },
    { id: 'plus', label: '', path: '' },
    { id: 'mon-nox', label: 'Mon NOX', path: '/mon-nox' },
    { id: 'moi', label: 'Moi', path: '/profile' },
  ];

  return (
    <>
      <QuickAddModal open={showAdd} onClose={() => setShowAdd(false)} />
      <nav className="nox-mobile-nav">
        {tabs.map((tab) => tab.id === 'plus' ? (
          <button key="plus" className="nox-mobile-nav__plus" onClick={() => setShowAdd(true)} aria-label="Ajouter">
            <Plus size={24} strokeWidth={2.8} />
          </button>
        ) : (
          <button
            key={tab.id}
            className={`nox-mobile-nav__item ${active === tab.id ? 'is-active' : ''}`}
            onClick={() => navigate(tab.path)}
          >
            {tab.label}
          </button>
        ))}
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
    <div style={{ minHeight: '100vh', background: '#0A0A0A', color: '#FFFFFF', paddingBottom: 100 }}>
      <main style={{ maxWidth: 560, margin: '0 auto', padding: '0 20px' }}>

        {/* HEADER */}
        <div style={{ paddingTop: 52, paddingBottom: 10 }}>
          <div style={{ fontSize: 13, color: '#777777', fontWeight: 700, marginBottom: 4 }}>{dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)}</div>
          <h1 style={{ margin: 0, fontSize: 38, fontWeight: 1000, letterSpacing: '-.05em', lineHeight: .95 }}>
            {firstName ? `Bonjour ${firstName} 👋` : 'Bonjour 👋'}
          </h1>
        </div>

        {/* PULSE */}
        {todayPulse ? (
          <section style={{ background: '#111111', border: '1px solid #222222', borderRadius: 26, padding: '18px 20px', margin: '18px 0 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 900, color: '#888888', letterSpacing: '.09em' }}>TON PULSE</div>
              <button onClick={() => navigate('/pulse')}
                style={{ fontSize: 10, fontWeight: 900, color: '#C8FF00', background: 'transparent', border: 0, cursor: 'pointer' }}>
                MODIFIER
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {[
                { label: 'Sommeil', value: todayPulse.sleep_score, emoji: '🌙' },
                { label: 'Énergie', value: todayPulse.energy_score, emoji: '⚡' },
                { label: 'Corps',   value: todayPulse.body_score,   emoji: '💪' },
              ].map(({ label, value, emoji }) => (
                <div key={label} style={{ background: '#1A1A1A', borderRadius: 18, padding: '14px 10px', textAlign: 'center' }}>
                  <div style={{ fontSize: 20, marginBottom: 6 }}>{emoji}</div>
                  <div style={{ fontSize: 26, fontWeight: 1000, color: '#FFFFFF', lineHeight: 1 }}>{value}</div>
                  <div style={{ fontSize: 9, color: '#666666', fontWeight: 800, marginTop: 4, letterSpacing: '.05em' }}>/5</div>
                  <div style={{ fontSize: 10, color: '#888888', fontWeight: 700, marginTop: 4 }}>{label}</div>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <section style={{ background: '#111111', border: '1px solid #222222', borderRadius: 26, padding: '22px 20px', margin: '18px 0 14px' }}>
            <div style={{ fontSize: 11, fontWeight: 900, color: '#888888', letterSpacing: '.09em', marginBottom: 12 }}>PULSE DU MATIN</div>
            <div style={{ fontSize: 17, fontWeight: 950, marginBottom: 6 }}>Comment tu vas aujourd'hui ?</div>
            <div style={{ fontSize: 13, color: '#666666', marginBottom: 18 }}>3 signaux · 10 secondes · NOX comprend ton état.</div>
            <button onClick={() => navigate('/pulse')}
              style={{ width: '100%', padding: 16, border: 0, borderRadius: 16, background: '#C8FF00', color: '#0A0A0A', fontWeight: 1000, fontSize: 14, cursor: 'pointer' }}>
              FAIRE MON PULSE →
            </button>
          </section>
        )}

        {/* PRIORITÉ DU JOUR */}
        {todayPulse && (
          <section style={{
            background: priority.type === 'none' ? '#111111' : '#0F1A00',
            border: priority.type === 'none' ? '1px solid #222222' : '1px solid #3A5200',
            borderRadius: 26, padding: '22px 20px', marginBottom: 14,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.09em', color: priority.type === 'none' ? '#888888' : '#C8FF00' }}>
                TA PRIORITÉ DU JOUR
              </div>
              <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: '.04em', color: '#555555', background: '#1A1A1A', padding: '5px 9px', borderRadius: 99 }}>
                {priority.confidence === 'high' ? 'ÉLEVÉE' : priority.confidence === 'moderate' ? 'MODÉRÉE' : 'FAIBLE'}
              </div>
            </div>

            {priority.type === 'none' ? (
              <>
                <div style={{ fontSize: 24, fontWeight: 1000, letterSpacing: '-.04em', marginBottom: 10 }}>Tout va bien ✓</div>
                <div style={{ fontSize: 13, color: '#888888', lineHeight: 1.55 }}>NOX n'a pas de signal suffisant pour te demander de modifier quelque chose aujourd'hui. Continue normalement.</div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 26, fontWeight: 1000, letterSpacing: '-.04em', lineHeight: 1.1, marginBottom: 10 }}>
                  {(priority as any).title}
                </div>
                <div style={{ fontSize: 14, color: '#AAAAAA', lineHeight: 1.55, marginBottom: 18 }}>
                  {(priority as any).action}
                </div>
              </>
            )}

            <details style={{ borderTop: '1px solid #222222', paddingTop: 14 }}>
              <summary style={{ cursor: 'pointer', fontSize: 11, fontWeight: 900, color: '#C8FF00', letterSpacing: '.05em', userSelect: 'none' }}>
                POURQUOI ? ›
              </summary>
              <div style={{ marginTop: 12, fontSize: 13, color: '#AAAAAA', lineHeight: 1.55, marginBottom: 12 }}>
                {priority.type !== 'none' ? (priority as any).reason : "Tes signaux du matin sont équilibrés — aucune zone ne nécessite d'intervention aujourd'hui."}
              </div>
              {priority.evidence.length > 0 && (
                <div style={{ display: 'grid', gap: 7 }}>
                  {priority.evidence.map(ev => (
                    <div key={ev.key} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 12px', background: '#1A1A1A', borderRadius: 12 }}>
                      <span style={{ fontSize: 11, color: '#666666', fontWeight: 700 }}>{ev.label}</span>
                      <span style={{ fontSize: 11, color: '#FFFFFF', fontWeight: 900 }}>{ev.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </details>

            {priority.type === 'activity' && todaySession && (
              <button onClick={() => navigate('/program')}
                style={{ width: '100%', padding: 16, marginTop: 16, border: 0, borderRadius: 16, background: '#C8FF00', color: '#0A0A0A', fontWeight: 1000, fontSize: 13, cursor: 'pointer' }}>
                COMMENCER MA SÉANCE →
              </button>
            )}
            {priority.type === 'nutrition' && (
              <button onClick={() => navigate('/fuel')}
                style={{ width: '100%', padding: 16, marginTop: 16, border: 0, borderRadius: 16, background: '#C8FF00', color: '#0A0A0A', fontWeight: 1000, fontSize: 13, cursor: 'pointer' }}>
                AJOUTER MON REPAS →
              </button>
            )}
          </section>
        )}

        {/* SÉANCE DU JOUR — uniquement si pertinent */}
        {todaySession && !todayWorkout && (
          <section style={{ background: '#111111', border: '1px solid #222222', borderRadius: 26, padding: '18px 20px', marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 900, color: '#888888', letterSpacing: '.09em', marginBottom: 12 }}>SÉANCE DU JOUR</div>
            <div style={{ fontSize: 18, fontWeight: 1000, marginBottom: 4 }}>{todaySession.name}</div>
            {todaySession.duration_minutes && (
              <div style={{ fontSize: 12, color: '#666666', marginBottom: 14 }}>{todaySession.duration_minutes} min · {todaySession.exercises?.length ?? 0} exercices</div>
            )}
            <button onClick={() => navigate('/program')}
              style={{ width: '100%', padding: 14, border: '1px solid #333333', borderRadius: 14, background: 'transparent', color: '#FFFFFF', fontWeight: 900, fontSize: 13, cursor: 'pointer' }}>
              VOIR MA SÉANCE →
            </button>
          </section>
        )}

        {todayWorkout && (
          <section style={{ background: '#0F1A00', border: '1px solid #3A5200', borderRadius: 26, padding: '18px 20px', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 12, background: '#C8FF00', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 18 }}>✓</span>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 1000, color: '#C8FF00' }}>SÉANCE FAITE</div>
                <div style={{ fontSize: 12, color: '#AAAAAA', marginTop: 2 }}>{todayWorkout.name}</div>
              </div>
            </div>
          </section>
        )}

        {/* NUTRITION RAPIDE */}
        {(todayKcal > 0 || todayProt > 0) && (
          <section style={{ background: '#111111', border: '1px solid #222222', borderRadius: 26, padding: '18px 20px', marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 900, color: '#888888', letterSpacing: '.09em' }}>NUTRITION AUJOURD'HUI</div>
              <button onClick={() => navigate('/fuel')}
                style={{ fontSize: 10, fontWeight: 900, color: '#C8FF00', background: 'transparent', border: 0, cursor: 'pointer' }}>VOIR →</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ background: '#1A1A1A', borderRadius: 16, padding: '14px 16px' }}>
                <div style={{ fontSize: 22, fontWeight: 1000 }}>{Math.round(todayKcal)}</div>
                <div style={{ fontSize: 10, color: '#666666', fontWeight: 800, marginTop: 3 }}>
                  kcal {caloriesTarget ? `/ ${caloriesTarget}` : ''}
                </div>
                {caloriesTarget > 0 && (
                  <div style={{ marginTop: 10, height: 4, background: '#2A2A2A', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(100, Math.round((todayKcal / caloriesTarget) * 100))}%`, height: '100%', background: '#C8FF00', borderRadius: 999 }} />
                  </div>
                )}
              </div>
              <div style={{ background: '#1A1A1A', borderRadius: 16, padding: '14px 16px' }}>
                <div style={{ fontSize: 22, fontWeight: 1000 }}>{Math.round(todayProt)}g</div>
                <div style={{ fontSize: 10, color: '#666666', fontWeight: 800, marginTop: 3 }}>
                  protéines {proteinTarget ? `/ ${proteinTarget}g` : ''}
                </div>
                {proteinTarget > 0 && (
                  <div style={{ marginTop: 10, height: 4, background: '#2A2A2A', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(100, Math.round((todayProt / proteinTarget) * 100))}%`, height: '100%', background: '#FF6B35', borderRadius: 999 }} />
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* CLÔTURE DU JOUR */}
        {todayPulse && !todayClosure && (
          <section style={{ background: '#111111', border: '1px solid #222222', borderRadius: 26, padding: '22px 20px', marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 900, color: '#888888', letterSpacing: '.09em', marginBottom: 12 }}>CLÔTURE DE JOURNÉE</div>
            <div style={{ fontSize: 17, fontWeight: 950, marginBottom: 6 }}>Ta journée touche à sa fin.</div>
            <div style={{ fontSize: 13, color: '#666666', marginBottom: 18 }}>As-tu accompli ta priorité du jour ?</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              {(['Oui', 'Non'] as const).map(val => (
                <button key={val}
                  onClick={() => setClosure(c => ({ ...c, priorityDone: val === 'Oui' }))}
                  style={{ padding: '14px 0', border: `1px solid ${closure.priorityDone === (val === 'Oui') ? '#C8FF00' : '#2A2A2A'}`, borderRadius: 14, background: closure.priorityDone === (val === 'Oui') ? '#0F1A00' : 'transparent', color: closure.priorityDone === (val === 'Oui') ? '#C8FF00' : '#AAAAAA', fontWeight: 1000, cursor: 'pointer', fontSize: 15 }}>
                  {val}
                </button>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 16 }}>
              {(['😴','😕','😐','🙂','😄'] as const).map((emoji, i) => (
                <button key={emoji}
                  onClick={() => setClosure(c => ({ ...c, feeling: i + 1 }))}
                  style={{ fontSize: 26, padding: '10px 0', border: `1px solid ${closure.feeling === i + 1 ? '#C8FF00' : '#222222'}`, borderRadius: 14, background: closure.feeling === i + 1 ? '#0F1A00' : 'transparent', cursor: 'pointer' }}>
                  {emoji}
                </button>
              ))}
            </div>
            <textarea
              placeholder="Une note rapide (optionnel)"
              value={closure.note}
              onChange={e => setClosure(c => ({ ...c, note: e.target.value }))}
              style={{ width: '100%', boxSizing: 'border-box', background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 14, padding: '13px 14px', color: '#FFFFFF', fontSize: 13, resize: 'none', outline: 'none', marginBottom: 12, font: 'inherit' }}
              rows={2}
            />
            <button onClick={saveClosure} disabled={savingClosure}
              style={{ width: '100%', padding: 16, border: 0, borderRadius: 16, background: '#C8FF00', color: '#0A0A0A', fontWeight: 1000, fontSize: 14, cursor: 'pointer', opacity: savingClosure ? 0.6 : 1 }}>
              {savingClosure ? 'ENREGISTREMENT...' : 'VALIDER'}
            </button>
          </section>
        )}

        {todayClosure && (
          <section style={{ background: '#0F1A00', border: '1px solid #3A5200', borderRadius: 26, padding: '16px 20px', marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 900, color: '#C8FF00', letterSpacing: '.09em', marginBottom: 4 }}>JOURNÉE CLÔTURÉE</div>
                <div style={{ fontSize: 13, color: '#AAAAAA' }}>NOX a enregistré ta journée.</div>
              </div>
              <button onClick={() => setEditingClosure(true)}
                style={{ fontSize: 10, fontWeight: 900, color: '#666666', background: 'transparent', border: 0, cursor: 'pointer' }}>MODIFIER</button>
            </div>
          </section>
        )}

      </main>

      <QuickAddModal open={showAdd} onClose={() => setShowAdd(false)} />
      <BottomNav active="home" />
    </div>
  );
}