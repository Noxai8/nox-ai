import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity, BatteryCharging, Camera, ChevronRight, Circle, CircleCheck, CircleUserRound, Droplets, Dumbbell, FileText, Moon, PersonStanding, Plus, Scale, Smile, Target, Utensils, X,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { generateDailyPriority, type DailyPriority } from '../lib/nox/priorityEngine';
import { todayLocalDate } from '../lib/localDate';
import NoxCompanion from '../components/NoxCompanion';
import { HABITS, habitName, isTargetMet, targetLine, usesValueInput, type UserHabit } from '../lib/nox/habits';
import { dayState, noxiLine } from '../lib/nox/noxiVoice';
import { isMissionDone, missionMinutes, suggestBlock, type DailyMission, type FocusSession } from '../lib/nox/focus';

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
    { label: 'Concentration',   icon: Target,   path: '/focus',     color: '#C8FF00' },
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
  const [habits, setHabits] = useState<UserHabit[]>([]);
  const [habitLogs, setHabitLogs] = useState<{ habit_id: string; date: string; count: number }[]>([]);
  const [habitBusy, setHabitBusy] = useState<string | null>(null);
  const [habitValue, setHabitValue] = useState<Record<string, string>>({});
  const [movedToday, setMovedToday] = useState(false);
  const [mission, setMission] = useState<DailyMission | null>(null);
  const [missionSessions, setMissionSessions] = useState<FocusSession[]>([]);
  const [nowTick, setNowTick] = useState(Date.now());
  const openSession = missionSessions.find(s => !s.ended_at) ?? null;
  useEffect(() => {
    if (!openSession) return;
    const t = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, [openSession?.id]);
  const [lastClosureDate, setLastClosureDate] = useState<string | null>(null);

  useEffect(() => { if (user) void loadAll(); }, [user]);

  // Habitudes actives + relevés des 7 derniers jours
  const loadHabits = async () => {
    if (!user) return;
    const since = new Date();
    since.setDate(since.getDate() - 6);
    const { data: hs, error: hErr } = await supabase
      .from('user_habits')
      .select('id, kind, label, mode, unit, baseline, daily_target, professional_support, risk_flag, active, started_on')
      .eq('user_id', user.id)
      .eq('active', true)
      .order('created_at');
    if (hErr) { console.error('user_habits:', hErr.message); return; }
    const list = ((hs ?? []) as UserHabit[]).filter(h => HABITS[h.kind]);
    setHabits(list);
    if (!list.length) { setHabitLogs([]); return; }
    const { data: logs, error: lErr } = await supabase
      .from('habit_logs')
      .select('habit_id, date, count')
      .eq('user_id', user.id)
      .gte('date', since.toLocaleDateString('sv-SE'));
    if (lErr) { console.error('habit_logs:', lErr.message); return; }
    setHabitLogs((logs ?? []).map((l: any) => ({ ...l, count: Number(l.count) })));
  };

  // Relevé du jour — le serveur fige la cible et calcule l'XP (plafond 80/jour)
  const logHabit = async (h: UserHabit, count: number) => {
    if (!user || habitBusy) return;
    setHabitBusy(h.id);
    const { error } = await supabase.from('habit_logs').upsert(
      { user_id: user.id, habit_id: h.id, date: todayLocalDate(), count: Math.max(0, count) },
      { onConflict: 'habit_id,date' },
    );
    if (error) console.error('habit_logs upsert:', error.message);
    await loadHabits();
    setHabitBusy(null);
  };

  const loadAll = async () => {
    if (!user) return;
    void loadHabits();

    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();

    const [{ data: prof }, { data: prog }, { data: tgts }, { data: food }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
      supabase.from('workout_programs').select('*').eq('user_id', user.id).eq('is_active', true).maybeSingle(),
      supabase.from('nutrition_targets').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('food_entries').select('*').eq('user_id', user.id).gte('created_at', start).lte('created_at', end),
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

    const [{ count: movesToday }, { data: prevClosure }] = await Promise.all([
      supabase.from('movement_logs').select('id', { count: 'exact', head: true })
        .eq('user_id', user.id).eq('date', todayLocalDate()),
      supabase.from('daily_closures').select('date')
        .eq('user_id', user.id).lt('date', todayLocalDate())
        .order('date', { ascending: false }).limit(1).maybeSingle(),
    ]);
    setMovedToday((movesToday ?? 0) > 0);

    const { data: m } = await supabase.from('daily_missions')
      .select('id, date, title, kind, target_minutes, done_at')
      .eq('user_id', user.id).eq('date', todayLocalDate()).maybeSingle();
    setMission((m as DailyMission) ?? null);
    if (m) {
      const { data: fs } = await supabase.from('focus_sessions')
        .select('id, mission_id, planned_minutes, started_at, ended_at, minutes, distractions')
        .eq('mission_id', (m as any).id);
      setMissionSessions((fs ?? []) as FocusSession[]);
    } else setMissionSessions([]);
    setLastClosureDate(prevClosure?.date ?? null);

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
  const caloriesTarget = Number(targets?.calories || 0);
  const proteinTarget = Number(targets?.protein_g || targets?.protein || 0);
  const carbsTarget = Number(targets?.carbs_g || targets?.carbs || 0);
  const fatTarget = Number(targets?.fat_g || targets?.fat || 0);
  const todayKcal = todayFood.reduce((sum, entry) => sum + Number(entry.calories || 0), 0);
  const todayProt = todayFood.reduce((sum, entry) => sum + Number(entry.protein || entry.protein_g || 0), 0);
  const todayCarbs = todayFood.reduce((sum, entry) => sum + Number(entry.carbs || entry.carbs_g || entry.carbohydrates || 0), 0);
  const todayFat = todayFood.reduce((sum, entry) => sum + Number(entry.fat || entry.fat_g || entry.fats || 0), 0);
  const caloriesRemaining = caloriesTarget > 0 ? Math.max(0, caloriesTarget - todayKcal) : null;
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
    profile: { goal_type: profile?.goal_type ?? null, focus_areas: profile?.focus_areas ?? null },
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
    mission: mission ? {
      title: mission.title,
      done: isMissionDone(mission, missionMinutes(missionSessions, mission.id)),
      remaining_minutes: mission.kind === 'duration'
        ? Math.max(0, (mission.target_minutes ?? 0) - missionMinutes(missionSessions, mission.id)) : null,
    } : null,
  }), [todayPulse, profile, todaySession, todayWorkout, daysSinceActivity, todayProt, proteinTarget, todayKcal, caloriesTarget, todayFood.length, mission, missionSessions]);

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
    else if (priority.type === 'focus') navigate('/focus');
  };

  const actionLabel =
    priority.type === 'nutrition' ? 'AJOUTER MON REPAS'
      : priority.type === 'activity' ? 'COMMENCER MA SÉANCE'
        : priority.type === 'focus' ? 'LANCER UN BLOC'
        : null;

  // ── Ta journée : uniquement des objectifs réels, cochés par des données réelles ──
  const todayKey = todayLocalDate();
  const focusAreas: string[] | null = profile?.focus_areas ?? null;
  const movementFocus = focusAreas == null || focusAreas.includes('movement');
  const focusOn = focusAreas == null || focusAreas.includes('focus');
  const closureState = {
    priorityTitle: priority.type !== 'none' ? (priority as any).title : null,
    priorityType: priority.type,
  };
  const nutritionFocus = focusAreas == null || focusAreas.includes('nutrition');
  const fr = (n: number) => Math.round(n).toLocaleString('fr-FR');
  const logToday = (h: UserHabit) => habitLogs.find(l => l.habit_id === h.id && l.date === todayKey);
  const stepsHabit = habits.find(h => h.kind === 'steps') ?? null;
  const stepsInMove = !!stepsHabit && movementFocus;
  // Jour de récupération : NOX ne demande pas de bouger, la ligne disparaît (jamais de case « ratée »)
  const restDay = priority.type === 'recovery';
  const kcalLow = Math.round(caloriesTarget * 0.9);
  const kcalHigh = Math.round(caloriesTarget * 1.1);

  type DayItem = { key: string; label: string; detail?: string; done: boolean; go: () => void };
  const dayItems: DayItem[] = [
    { key: 'pulse', label: 'Pulse du matin', done: !!todayPulse, go: () => navigate('/pulse') },
    ...(mission ? [{
      key: 'mission', label: `Concentration · ${mission.title}`,
      detail: mission.kind === 'duration'
        ? `${missionMinutes(missionSessions, mission.id)} / ${mission.target_minutes} min` : undefined,
      done: isMissionDone(mission, missionMinutes(missionSessions, mission.id)),
      go: () => navigate('/focus'),
    }] : focusOn ? [{ key: 'mission', label: 'Concentration · définir ta mission', done: false, go: () => navigate('/focus') }] : []),
    ...(movementFocus && !restDay ? [stepsInMove ? {
      key: 'move', label: 'Bouger',
      detail: `${fr(logToday(stepsHabit!)?.count ?? 0)} / ${fr(stepsHabit!.daily_target ?? 0)} pas · déclaré`,
      done: (logToday(stepsHabit!)?.count ?? 0) >= (stepsHabit!.daily_target ?? Infinity),
      go: () => navigate(`/habits/${stepsHabit!.id}`),
    } : {
      key: 'move', label: 'Bouger',
      detail: todaySession ? todaySession.name : 'une séance ou une activité',
      done: !!todayWorkout || movedToday, go: () => navigate(todaySession ? '/program' : '/movement'),
    }] : []),
    ...(nutritionFocus ? [caloriesTarget > 0 ? {
      key: 'nutrition', label: 'Nutrition',
      // Zone autour de la cible, jamais un chiffre exact ; information seulement, sans effet sur l'XP
      detail: `${fr(todayKcal)} kcal · zone ${fr(kcalLow)}–${fr(kcalHigh)}`,
      done: todayKcal >= kcalLow && todayKcal <= kcalHigh,
      go: () => navigate('/fuel'),
    } : {
      key: 'nutrition', label: 'Nutrition', detail: `${todayFood.length} repas enregistré${todayFood.length > 1 ? 's' : ''}`,
      done: todayFood.length >= 2, go: () => navigate('/fuel'),
    }] : []),
    ...habits.filter(h => !(stepsInMove && h.id === stepsHabit?.id)).map(h => {
      const log = logToday(h);
      return {
        key: h.id, label: habitName(h),
        detail: log ? targetLine(log.count, h.daily_target, h.mode, h.unit) : 'à noter',
        done: !!log && (h.mode === 'track' || isTargetMet(log.count, h.daily_target, h.mode) === true),
        go: () => navigate(`/habits/${h.id}`),
      };
    }),
    // La clôture reste toujours accessible, même si tout n'est pas fait
    { key: 'closure', label: 'Clôture du soir', done: !!todayClosure, go: () => navigate('/closure', { state: closureState }) },
  ];
  const dayDone = dayItems.filter(i => i.done).length;
  const daysSinceLastClosure = lastClosureDate
    ? Math.round((new Date(`${todayKey}T12:00:00`).getTime() - new Date(`${lastClosureDate}T12:00:00`).getTime()) / 86400000)
    : null;
  const noxiMessage = noxiLine(dayState({
    done: dayDone, total: dayItems.length, pulseDone: !!todayPulse, closureDone: !!todayClosure,
    localHour: new Date().getHours(), daysSinceLastClosure,
  }), todayKey);

  const pulseItems = todayPulse ? [
    { label: 'Sommeil', value: Number(todayPulse.sleep_score), Icon: Moon },
    { label: 'Énergie', value: Number(todayPulse.energy_score), Icon: BatteryCharging },
    { label: 'Corps', value: Number(todayPulse.body_score), Icon: PersonStanding },
  ] : [];

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: '#080A09',
        color: '#FFFFFF',
        paddingBottom: 'calc(126px + env(safe-area-inset-bottom))',
      }}
    >
      <main className="nox-home-main">
        <header className="nox-home-header">
          <div style={{ color: '#858986', fontSize: 12, fontWeight: 900, letterSpacing: '.13em', textTransform: 'uppercase', marginBottom: 10 }}>
            {dateLabel}
          </div>
          <h1 style={{ margin: 0, fontSize: 'clamp(42px, 7vw, 58px)', lineHeight: .95, letterSpacing: '-.06em', fontWeight: 1000 }}>
            Aujourd'hui
          </h1>
          <div style={{ marginTop: 16, color: '#F2F2F2', fontSize: 16, fontWeight: 850 }}>
            {firstName ? `Bonjour ${firstName} 👋` : 'Bonjour 👋'}
          </div>
          <div style={{ marginTop: 10, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ marginTop: 3, padding: '3px 7px', borderRadius: 999, background: 'rgba(200,255,0,.12)', color: '#C8FF00', fontSize: 9, fontWeight: 950, letterSpacing: '.08em', flexShrink: 0 }}>NOXI</span>
            <span style={{ color: '#C9CDCA', fontSize: 14, lineHeight: 1.5 }}>{noxiMessage}</span>
          </div>
        </header>

        <section className="nox-home-section">
          <SectionHeader title="Ta journée" action={`${dayDone}/${dayItems.length}`} />
          <AppCard style={{ padding: 18 }}>
            <div style={{ height: 6, borderRadius: 999, background: '#343835', overflow: 'hidden', marginBottom: 14 }}>
              <div style={{ width: `${(dayDone / Math.max(1, dayItems.length)) * 100}%`, height: '100%', borderRadius: 999, background: '#C8FF00', transition: 'width .5s ease' }} />
            </div>
            <div style={{ display: 'grid' }}>
              {dayItems.map((item, i) => (
                <button key={item.key} onClick={item.go}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 2px', border: 0, borderTop: i ? '1px solid #343835' : 'none', background: 'transparent', color: '#FFFFFF', cursor: 'pointer', textAlign: 'left' }}>
                  {item.done ? <CircleCheck size={20} color="#C8FF00" /> : <Circle size={20} color="#747A76" />}
                  <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 850, color: item.done ? '#A5AAA6' : '#FFFFFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
                  {item.detail && <span style={{ color: '#747A76', fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap', flexShrink: 0 }}>{item.detail}</span>}
                  {!item.done && <span style={{ color: '#747A76', fontSize: 16 }}>›</span>}
                </button>
              ))}
            </div>
          </AppCard>
        </section>

        <section className="nox-home-section">
          <SectionHeader title="Ton Pulse" action={todayPulse ? 'Modifier ›' : 'Commencer ›'} onAction={() => navigate('/pulse')} />
          {todayPulse ? (
            <AppCard style={{ padding: 12 }}>
              <div className="nox-pulse-grid">
                {pulseItems.map(({ label, value, Icon }) => (
                  <div key={label} className="nox-pulse-item">
                    <div className="nox-pulse-icon"><Icon size={25} strokeWidth={2.25} /></div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                        <span style={{ fontSize: 32, lineHeight: 1, fontWeight: 1000, letterSpacing: '-.045em' }}>{value}</span>
                        <span style={{ color: '#747975', fontSize: 13, fontWeight: 900 }}>/5</span>
                      </div>
                      <div style={{ marginTop: 6, color: '#D0D3D1', fontSize: 12, fontWeight: 800 }}>{label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </AppCard>
          ) : (
            <AppCard style={{ padding: 24 }}>
              <div style={{ fontSize: 22, fontWeight: 1000, letterSpacing: '-.03em', marginBottom: 8 }}>Comment tu vas aujourd'hui ?</div>
              <div style={{ color: '#A7ACA8', fontSize: 14, lineHeight: 1.5, marginBottom: 20 }}>
                Sommeil, énergie et état du corps. Quelques secondes pour donner du contexte à NOX.
              </div>
              <LimeButton onClick={() => navigate('/pulse')}>FAIRE MON PULSE →</LimeButton>
            </AppCard>
          )}
        </section>

        <section className="nox-home-section">
          <SectionHeader title="Nutrition aujourd'hui" action="Voir détails ›" onAction={() => navigate('/fuel')} />
          <AppCard style={{ padding: 0, borderColor: 'rgba(200,255,0,.24)' }}>
            <div className="nox-nutrition-card">
              <div className="nox-calorie-ring" style={{
                ['--progress' as any]: caloriesTarget > 0 ? `${Math.min(100, Math.round((todayKcal / caloriesTarget) * 100)) * 3.6}deg` : '0deg',
              }}>
                <div className="nox-calorie-ring-inner">
                  <Utensils size={21} color="#C8FF00" />
                  <div style={{ fontSize: 34, lineHeight: 1, fontWeight: 1000, letterSpacing: '-.05em', marginTop: 8 }}>
                    {caloriesRemaining !== null ? Math.round(caloriesRemaining) : '—'}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 900, marginTop: 5 }}>
                    {caloriesRemaining !== null ? 'kcal restantes' : 'objectif à définir'}
                  </div>
                  {caloriesTarget > 0 && <div style={{ fontSize: 11, color: '#777D79', marginTop: 4 }}>sur {Math.round(caloriesTarget)}</div>}
                </div>
              </div>

              <div className="nox-macro-list">
                <MacroRow icon={<Utensils size={17} />} value={Math.round(todayKcal)} target={caloriesTarget} unit="kcal" accent="#C8FF00" />
                {proteinTarget > 0 && <MacroRow icon={<Dumbbell size={17} />} value={Math.round(todayProt)} target={proteinTarget} unit="g protéines" accent="#45BFFF" />}
                {carbsTarget > 0 && <MacroRow icon={<Activity size={17} />} value={Math.round(todayCarbs)} target={carbsTarget} unit="g glucides" accent="#FF9D32" />}
                {fatTarget > 0 && <MacroRow icon={<Droplets size={17} />} value={Math.round(todayFat)} target={fatTarget} unit="g lipides" accent="#9C62FF" />}
              </div>

              <div className="nox-nutrition-goal">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#C8FF00', fontSize: 10, fontWeight: 950, letterSpacing: '.05em' }}>
                  <Target size={17} /> OBJECTIF DU JOUR
                </div>
                <div style={{ fontSize: 18, lineHeight: 1.15, fontWeight: 1000, marginTop: 16 }}>
                  {caloriesTarget > 0 ? (todayKcal <= caloriesTarget ? 'Rester dans ta cible' : 'Cible dépassée') : 'Définis ta cible'}
                </div>
                <div style={{ color: '#A8ACA9', fontSize: 13, lineHeight: 1.5, marginTop: 9 }}>
                  {caloriesRemaining !== null
                    ? todayKcal <= caloriesTarget
                      ? `Il te reste ${Math.round(caloriesRemaining)} kcal pour atteindre ton objectif aujourd'hui.`
                      : `Tu as consommé ${Math.round(todayKcal - caloriesTarget)} kcal au-delà de ta cible actuelle.`
                    : 'Ajoute un objectif nutritionnel pour afficher tes calories restantes.'}
                </div>
              </div>
            </div>
          </AppCard>
        </section>

        {todayPulse && (
          <section className="nox-home-section">
            <AppCard style={{ padding: 24 }}>
              <div className="nox-now-row">
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#9EA39F', fontSize: 11, fontWeight: 900, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 10 }}>
                    <span style={{ color: '#C8FF00' }}>✦</span> NOX maintenant
                  </div>
                  <div style={{ fontSize: 22, lineHeight: 1.1, fontWeight: 1000, letterSpacing: '-.035em' }}>{priorityTitle}</div>
                  <div style={{ color: '#B3B7B4', fontSize: 14, lineHeight: 1.55, marginTop: 8 }}>{priorityAction}</div>
                </div>
                <details className="nox-now-details">
                  <summary>Pourquoi ? ›</summary>
                  <div>{priorityReason}</div>
                </details>
              </div>
            </AppCard>
          </section>
        )}

        <section className="nox-home-section">
          <SectionHeader title="Priorité du jour" action={todayPulse ? (priority.confidence === 'high' ? 'Élevée' : priority.confidence === 'moderate' ? 'Modérée' : 'Faible') : undefined} />
          <AppCard style={{ padding: 18 }}>
            <div className="nox-compact-row">
              <div className="nox-square-icon"><Target size={24} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                {todayPulse && priority.type !== 'none' && <div style={{ color: '#C8FF00', fontSize: 9, fontWeight: 950, letterSpacing: '.055em', marginBottom: 5 }}>NOX RECOMMANDE</div>}
                <div style={{ fontSize: 20, fontWeight: 1000, letterSpacing: '-.03em' }}>
                  {!todayPulse ? 'À préciser avec ton Pulse' : priorityTitle}
                </div>
                <div style={{ color: '#A7ACA8', fontSize: 13, lineHeight: 1.45, marginTop: 5 }}>
                  {!todayPulse ? 'NOX attend tes trois signaux du matin avant de fixer la priorité de ta journée.' : priorityAction}
                </div>
              </div>
              {actionLabel && <button className="nox-round-arrow" onClick={mainAction}><ChevronRight size={20} /></button>}
            </div>
          </AppCard>
        </section>

        {(mission || focusOn) && (() => {
          // Concentration = intention choisie par l'utilisateur (≠ Priorité du jour, recommandée par NOX).
          // Toutes les valeurs viennent du serveur (missions, sessions) ; rien n'est calculé ici pour l'XP.
          const mins = mission ? missionMinutes(missionSessions, mission.id) : 0;
          const done = mission ? isMissionDone(mission, mins) : false;
          const tip = suggestBlock(todayPulse, new Date().getHours());
          const running = openSession && mission && openSession.mission_id === mission.id;
          const elapsed = running ? Math.max(0, Math.floor((nowTick - new Date(openSession!.started_at).getTime()) / 1000)) : 0;
          const clock = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`;
          const label = { fontSize: 11, fontWeight: 900, letterSpacing: '.06em', color: '#8E938F', marginBottom: 8 } as const;
          return (
            <section className="nox-home-section">
              <SectionHeader title="Concentration" action={mission ? 'Ouvrir ›' : undefined} onAction={() => navigate('/focus')} />
              <AppCard style={{ padding: 20 }}>
                {!mission ? (
                  <>
                    <div style={label}>MISSION DU JOUR</div>
                    <div style={{ color: '#A5AAA6', fontSize: 14, lineHeight: 1.5, marginBottom: 16 }}>
                      Ce que tu décides d’accomplir aujourd’hui. Une seule chose importante.
                    </div>
                    <DarkButton onClick={() => navigate('/focus')}>DÉFINIR MA MISSION DU JOUR →</DarkButton>
                  </>
                ) : (
                  <>
                    <div style={label}>MISSION DU JOUR · {mission.kind === 'duration' ? 'DURÉE' : 'TÂCHE'}</div>
                    <div style={{ fontSize: 19, fontWeight: 950, letterSpacing: '-.02em' }}>« {mission.title} »</div>

                    {mission.kind === 'duration' && (
                      <>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', margin: '12px 0 8px', fontSize: 13, color: '#A5AAA6' }}>
                          <span>{mission.target_minutes} min prévues</span>
                          <span>·</span>
                          <span style={{ fontWeight: 950, color: done ? '#C8FF00' : '#FFFFFF' }}>{mins} min réalisées</span>
                        </div>
                        <div style={{ height: 6, borderRadius: 999, background: '#343835', overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(100, (mins / Math.max(1, mission.target_minutes ?? 1)) * 100)}%`, height: '100%', background: '#C8FF00', borderRadius: 999 }} />
                        </div>
                      </>
                    )}

                    {done ? (
                      <div style={{ marginTop: 14, fontSize: 14, fontWeight: 950, color: '#C8FF00' }}>
                        ✓ Mission accomplie{mission.kind === 'duration' ? ` · ${mins} min` : ''}
                      </div>
                    ) : running ? (
                      <>
                        <div style={{ marginTop: 14, fontSize: 14, fontWeight: 950 }}>
                          <span style={{ fontVariantNumeric: 'tabular-nums' }}>{clock}</span>
                          <span style={{ color: '#A5AAA6', fontWeight: 750 }}> en cours</span>
                        </div>
                        <LimeButton onClick={() => navigate('/focus')} style={{ marginTop: 14 }}>REPRENDRE →</LimeButton>
                      </>
                    ) : mission.kind === 'duration' ? (
                      <>
                        <div style={{ color: '#A5AAA6', fontSize: 12, lineHeight: 1.5, margin: '14px 0' }}>
                          <span style={{ color: '#C8FF00', fontWeight: 900 }}>NOX : </span>{tip.reason}
                        </div>
                        <DarkButton onClick={() => navigate('/focus')}>{mins > 0 ? 'CONTINUER →' : 'COMMENCER →'}</DarkButton>
                      </>
                    ) : (
                      <DarkButton onClick={() => navigate('/focus')} style={{ marginTop: 14 }}>TERMINER →</DarkButton>
                    )}
                  </>
                )}
              </AppCard>
            </section>
          );
        })()}

        {habits.length > 0 && (
          <section className="nox-home-section">
            <SectionHeader title="Mes objectifs" action="Gérer ›" onAction={() => navigate('/habits')} />
            <div style={{ display: 'grid', gap: 10 }}>
              {habits.map(h => {
                const def = HABITS[h.kind];
                const Icon = def.icon;
                const today = todayLocalDate();
                const logs = habitLogs.filter(l => l.habit_id === h.id);
                const todayLog = logs.find(l => l.date === today);
                const weekTotal = logs.reduce((s, l) => s + l.count, 0);
                const avg = logs.length ? Math.round((weekTotal / logs.length) * 10) / 10 : null;
                const target = h.daily_target;
                const met = todayLog ? isTargetMet(todayLog.count, target, h.mode) : null;
                const build = h.mode === 'build';
                const valueMode = usesValueInput(h);
                const draftValue = habitValue[h.id] ?? '';
                const busy = habitBusy === h.id;
                const stop = (e: React.MouseEvent) => e.stopPropagation();
                const pill: React.CSSProperties = { height: 40, minWidth: 48, padding: '0 14px', borderRadius: 12, border: '1px solid #343835', background: '#191C1A', color: '#FFFFFF', fontSize: 13, fontWeight: 900, cursor: busy ? 'wait' : 'pointer', opacity: busy ? .6 : 1 };
                return (
                  <AppCard key={h.id} style={{ padding: 18, cursor: 'pointer' }}>
                    <div onClick={() => navigate(`/habits/${h.id}`)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div className="nox-square-icon"><Icon size={22} /></div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 15, fontWeight: 950 }}>{habitName(h)}</div>
                          <div style={{ color: '#8E938F', fontSize: 11, fontWeight: 800, marginTop: 3 }}>
                            {build ? `Objectif : au moins ${Number(target).toLocaleString('fr-FR')}${h.kind === 'steps' ? ' · déclaré' : ''}`
                              : h.mode === 'track' ? 'Suivi seulement' : h.mode === 'stop' ? 'Objectif : arrêter' : 'Objectif : réduire'}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 26, fontWeight: 1000, letterSpacing: '-.04em', lineHeight: 1 }}>
                            {todayLog ? todayLog.count.toLocaleString('fr-FR') : '—'}
                            {target != null && <span style={{ color: '#747A76', fontSize: 15, fontWeight: 900 }}> / {target.toLocaleString('fr-FR')}</span>}
                          </div>
                          <div style={{ color: '#747A76', fontSize: 10, fontWeight: 800, marginTop: 4 }}>{h.unit} aujourd’hui</div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', marginTop: 14, fontSize: 12, color: '#A5AAA6' }}>
                        {met === true && <span style={{ color: '#C8FF00', fontWeight: 900 }}>{build ? 'Objectif atteint ✓' : 'Dans ta cible ✓'}</span>}
                        {met === false && !build && <span style={{ fontWeight: 800 }}>Au-dessus de ta cible aujourd’hui</span>}
                        {met === false && build && <span style={{ fontWeight: 800 }}>Encore {(Number(target) - todayLog!.count).toLocaleString('fr-FR')} {h.unit}</span>}
                        {!todayLog && <span>Pas encore noté aujourd’hui</span>}
                        {h.kind === 'alcohol' && logs.length > 0 && <span>Cette semaine : {weekTotal} {def.unit}</span>}
                        {!build && h.baseline != null && avg != null && <span>Départ {h.baseline}/jour → {avg}/jour sur 7 j</span>}
                      </div>

                      {valueMode ? (
                        <div style={{ display: 'flex', gap: 8, marginTop: 14 }} onClick={stop}>
                          <input type="number" inputMode="numeric" min={0} max={100000} value={draftValue}
                            placeholder={todayLog ? String(todayLog.count) : `Ex : ${Math.round(Number(target ?? 0) / 2) || 10}`}
                            onChange={e => setHabitValue(v => ({ ...v, [h.id]: e.target.value }))}
                            style={{ flex: 1, minWidth: 0, height: 40, padding: '0 12px', borderRadius: 12, border: '1px solid #343835', background: '#191C1A', color: '#FFFFFF', fontSize: 14, fontWeight: 900, outline: 'none' }} />
                          <button style={pill} disabled={busy || draftValue === '' || Number(draftValue) < 0}
                            onClick={() => { void logHabit(h, Number(draftValue)); setHabitValue(v => ({ ...v, [h.id]: '' })); }}>
                            Enregistrer
                          </button>
                        </div>
                      ) : (
                      <div style={{ display: 'flex', gap: 8, marginTop: 14 }} onClick={stop}>
                        {!todayLog && !build ? (
                          <button style={{ ...pill, flex: 1 }} disabled={busy} onClick={() => logHabit(h, 0)}>
                            Aucun{h.kind === 'tobacco' ? 'e' : ''} aujourd’hui
                          </button>
                        ) : (
                          <button style={pill} disabled={busy || !todayLog || todayLog.count <= 0} onClick={() => todayLog && logHabit(h, todayLog.count - 1)} aria-label="Retirer 1">−1</button>
                        )}
                        <button style={{ ...pill, flex: todayLog || build ? 1 : undefined }} disabled={busy} onClick={() => logHabit(h, (todayLog?.count ?? 0) + 1)} aria-label="Ajouter 1">+1</button>
                      </div>
                      )}
                    </div>
                  </AppCard>
                );
              })}
            </div>
            <div style={{ color: '#747A76', fontSize: 11, lineHeight: 1.5, marginTop: 10 }}>
              Tenir une habitude à réduire ou arrêter compte pour ta journée alignée. Les objectifs du quotidien enrichissent ta journée sans rapporter d’XP. Un dépassement ne fait jamais perdre de progression.
            </div>
          </section>
        )}

        {todaySession && !todayWorkout && (
          <section className="nox-home-section">
            <SectionHeader title="Mouvement" action="Plus" onAction={() => navigate('/program')} />
            <AppCard style={{ padding: 18 }}>
              <div className="nox-compact-row">
                <div className="nox-square-icon nox-square-icon--neutral"><Dumbbell size={25} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#8E938F', fontSize: 10, fontWeight: 900, letterSpacing: '.07em', marginBottom: 6 }}>SÉANCE DU JOUR</div>
                  <div style={{ fontSize: 22, fontWeight: 1000, letterSpacing: '-.035em' }}>{todaySession.name}</div>
                  {todaySession.duration_minutes && <div style={{ color: '#A7ACA8', fontSize: 13, marginTop: 5 }}>{todaySession.duration_minutes} min · {todaySession.exercises?.length ?? 0} exercices</div>}
                </div>
                <button className="nox-session-button" onClick={() => navigate('/program')}>VOIR MA SÉANCE →</button>
              </div>
            </AppCard>
          </section>
        )}

        {todayWorkout && (
          <section className="nox-home-section">
            <SectionHeader title="Mouvement" />
            <AppCard style={{ padding: 20 }}>
              <div className="nox-compact-row">
                <div className="nox-square-icon"><Dumbbell size={24} /></div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 1000 }}>Séance terminée</div>
                  <div style={{ color: '#A7ACA8', fontSize: 13, marginTop: 4 }}>{todayWorkout.name}</div>
                </div>
              </div>
            </AppCard>
          </section>
        )}

        {!todayClosure ? (
          <section className="nox-home-section nox-home-last-section">
            <SectionHeader title="Clôture de journée" />
            <AppCard style={{ padding: 18 }}>
              <div className="nox-compact-row">
                <div className="nox-square-icon"><Activity size={24} /></div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 20, fontWeight: 1000, letterSpacing: '-.03em' }}>{todayPulse ? 'Ta journée touche à sa fin.' : 'Ton bilan viendra ici ce soir.'}</div>
                  <div style={{ color: '#A7ACA8', fontSize: 13, marginTop: 5 }}>{todayPulse ? '30 secondes pour clôturer avec NOX.' : 'Commence par ton Pulse pour donner à NOX le contexte de ta journée.'}</div>
                </div>
                {todayPulse && <button className="nox-round-arrow" onClick={() => navigate('/closure', { state: { priorityTitle: priority.type !== 'none' ? (priority as any).title : null, priorityType: priority.type } })}><ChevronRight size={20} /></button>}
              </div>
            </AppCard>
          </section>
        ) : (
          <section className="nox-home-section nox-home-last-section">
            <SectionHeader title="Clôture de journée" />
            <AppCard style={{ padding: 20 }}>
              <div className="nox-compact-row">
                <div className="nox-square-icon"><Activity size={24} /></div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#C8FF00', fontSize: 14, fontWeight: 950 }}>Journée clôturée ✓</div>
                  <div style={{ color: '#A7ACA8', fontSize: 12, marginTop: 4 }}>NOX a enregistré ta journée.</div>
                </div>
                <button onClick={() => setEditingClosure(true)} style={{ border: 0, background: 'transparent', color: '#C8FF00', fontSize: 12, fontWeight: 900, cursor: 'pointer' }}>Modifier</button>
              </div>
            </AppCard>
          </section>
        )}
      </main>

      <BottomNav active="home" />

      <style>{`
        .nox-home-main { width:100%; max-width:920px; margin:0 auto; padding:0 22px; box-sizing:border-box; }
        .nox-home-header { padding-top:42px; padding-bottom:30px; }
        .nox-home-section { margin-bottom:18px; }
        .nox-home-last-section { margin-bottom:38px; }
        .nox-pulse-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; }
        .nox-pulse-item { min-height:104px; padding:15px 16px; border:1px solid #2A2E2C; border-radius:18px; background:linear-gradient(145deg,#171A18,#121513); display:flex; align-items:center; gap:15px; }
        .nox-pulse-icon { width:50px; height:50px; flex:0 0 auto; display:grid; place-items:center; border-radius:50%; color:#C8FF00; background:rgba(200,255,0,.08); }
        .nox-nutrition-card { display:grid; grid-template-columns:210px minmax(240px,1fr) 220px; gap:24px; align-items:center; padding:22px; background:radial-gradient(circle at 12% 40%,rgba(200,255,0,.055),transparent 34%); }
        .nox-calorie-ring { --progress:0deg; width:170px; height:170px; margin:auto; border-radius:50%; display:grid; place-items:center; background:conic-gradient(#C8FF00 var(--progress),#2A2E2C 0); position:relative; }
        .nox-calorie-ring::after { content:''; position:absolute; inset:12px; border-radius:50%; background:#111513; }
        .nox-calorie-ring-inner { position:relative; z-index:1; text-align:center; }
        .nox-macro-list { display:grid; gap:14px; }
        .nox-nutrition-goal { align-self:stretch; padding:20px; border-radius:18px; border:1px solid #2A2E2C; background:rgba(255,255,255,.018); }
        .nox-now-row { display:flex; align-items:center; gap:24px; }
        .nox-now-details { flex:0 0 auto; max-width:240px; }
        .nox-now-details summary { list-style:none; cursor:pointer; border:1px solid rgba(200,255,0,.38); border-radius:999px; padding:11px 18px; color:#C8FF00; font-size:12px; font-weight:950; text-align:center; }
        .nox-now-details div { margin-top:12px; color:#A7ACA8; font-size:12px; line-height:1.5; }
        .nox-compact-row { display:flex; align-items:center; gap:16px; }
        .nox-square-icon { width:56px; height:56px; flex:0 0 auto; border-radius:16px; display:grid; place-items:center; color:#C8FF00; background:rgba(200,255,0,.09); }
        .nox-square-icon--neutral { color:#FFF; background:#1D201E; }
        .nox-round-arrow { width:42px; height:42px; flex:0 0 auto; border-radius:50%; border:1px solid #2D312E; background:#151816; color:#FFF; display:grid; place-items:center; cursor:pointer; }
        .nox-session-button { flex:0 0 auto; border:0; border-radius:14px; background:#C8FF00; color:#090B0A; padding:13px 18px; font-size:11px; font-weight:1000; cursor:pointer; }
        @media (max-width:760px) {
          .nox-home-main { padding:0 16px; }
          .nox-home-header { padding-top:34px; }
          .nox-pulse-item { padding:14px 8px; flex-direction:column; text-align:center; gap:9px; }
          .nox-pulse-icon { width:44px; height:44px; }
          .nox-nutrition-card { grid-template-columns:1fr; gap:20px; }
          .nox-calorie-ring { width:160px; height:160px; }
          .nox-nutrition-goal { text-align:left; }
          .nox-now-row { align-items:flex-start; flex-direction:column; }
          .nox-now-details { width:100%; max-width:none; }
          .nox-compact-row { align-items:center; }
          .nox-session-button { padding:12px; }
        }
        @media (max-width:430px) {
          .nox-session-button { font-size:0; width:42px; height:42px; border-radius:50%; padding:0; }
          .nox-session-button::after { content:'›'; font-size:24px; }
        }
      `}</style>
    </div>
  );

}

// ── Composants helper ──────────────────────────────────────────────────────────

const ui = {
  bigTitle: {
    fontSize: 28,
    lineHeight: 1.1,
    fontWeight: 1000,
    letterSpacing: '-.035em',
    marginBottom: 10,
    color: '#FFFFFF',
  } as React.CSSProperties,
  body: {
    fontSize: 14,
    lineHeight: 1.55,
    color: '#B3B7B4',
    marginBottom: 0,
  } as React.CSSProperties,
};

function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 900, color: '#8E938F', letterSpacing: '.05em', textTransform: 'uppercase' }}>{title}</div>
      {action && (
        <button onClick={onAction} style={{ border: 0, background: 'transparent', color: '#C8FF00', fontSize: 12, fontWeight: 900, cursor: onAction ? 'pointer' : 'default' }}>
          {action}
        </button>
      )}
    </div>
  );
}

function AppCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: 'linear-gradient(145deg,#141816,#101311)', border: '1px solid #242925', borderRadius: 22, overflow: 'hidden', ...style }}>
      {children}
    </div>
  );
}

function LimeButton({ children, onClick, style }: { children: React.ReactNode; onClick?: () => void; style?: React.CSSProperties }) {
  return (
    <button onClick={onClick} style={{ display: 'block', width: '100%', padding: '16px 20px', border: 0, borderRadius: 16, background: '#C8FF00', color: '#090B0A', fontWeight: 1000, fontSize: 14, cursor: 'pointer', textAlign: 'center', ...style }}>
      {children}
    </button>
  );
}

function DarkButton({ children, onClick, style }: { children: React.ReactNode; onClick?: () => void; style?: React.CSSProperties }) {
  return (
    <button onClick={onClick} style={{ display: 'block', width: '100%', padding: '16px 20px', border: '1px solid #2A2E2C', borderRadius: 16, background: '#1A1D1B', color: '#FFFFFF', fontWeight: 900, fontSize: 13, cursor: 'pointer', textAlign: 'center', ...style }}>
      {children}
    </button>
  );
}


function MacroRow({ icon, value, target, unit, accent }: { icon: React.ReactNode; value: number; target: number; unit: string; accent: string }) {
  const progress = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '42px 1fr 42px', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 40, height: 40, borderRadius: 13, display: 'grid', placeItems: 'center', color: accent, background: `${accent}16` }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 900 }}>
          {value.toLocaleString('fr-FR')} <span style={{ color: '#8E938F', fontWeight: 700 }}>/ {target.toLocaleString('fr-FR')} {unit}</span>
        </div>
        <div style={{ height: 7, marginTop: 8, borderRadius: 999, background: '#282C29', overflow: 'hidden' }}>
          <div style={{ width: `${progress}%`, height: '100%', borderRadius: 999, background: accent }} />
        </div>
      </div>
      <div style={{ color: '#A7ACA8', fontSize: 12, fontWeight: 800, textAlign: 'right' }}>{progress}%</div>
    </div>
  );
}


function Metric({ value, label, progress }: { value: string | number; label: string; progress?: number }) {
  return (
    <div style={{ background: '#1A1D1B', borderRadius: 16, padding: '16px' }}>
      <div style={{ fontSize: 26, fontWeight: 1000, letterSpacing: '-.035em', marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 11, color: '#8E938F', fontWeight: 800, marginBottom: progress ? 10 : 0 }}>{label}</div>
      {progress !== undefined && progress > 0 && (
        <div style={{ height: 4, background: '#2A2E2C', borderRadius: 999, overflow: 'hidden' }}>
          <div style={{ width: `${Math.min(100, Math.round(progress * 100))}%`, height: '100%', background: '#C8FF00', borderRadius: 999 }} />
        </div>
      )}
    </div>
  );
}
