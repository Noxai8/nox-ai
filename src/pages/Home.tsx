import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity, Camera, ChevronRight, CircleUserRound, Droplets,
  Dumbbell, Plus, Scale, Utensils, X,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { generateDailyPriority, type DailyPriority } from '../lib/nox/priorityEngine';
import { todayLocalDate } from '../lib/localDate';
import NoxCompanion from '../components/NoxCompanion';

type Completion = 'yes' | 'partial' | 'no';
type NavActive = 'home' | 'nutrition' | 'progress' | 'moi';

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
    { label: 'Repas', icon: Utensils, path: '/food-scan' },
    { label: 'Eau', icon: Droplets, path: '/fuel' },
    { label: 'Activité', icon: Dumbbell, path: '/program' },
    { label: 'Poids', icon: Scale, path: '/body' },
    { label: 'Photo', icon: Camera, path: '/progress' },
  ];

  return (
    <div className="nox-modal-backdrop" onClick={onClose}>
      <div className="nox-modal" onClick={(e) => e.stopPropagation()}>
        <div className="nox-modal__handle" />
        <div className="nox-modal__header">
          <div>
            <div className="nox-eyebrow">DONNER UNE INFO À NOX</div>
            <h2>Qu’est-ce qui vient de se passer ?</h2>
          </div>
          <button className="nox-icon-button" onClick={onClose} aria-label="Fermer"><X size={19} /></button>
        </div>
        <div className="nox-modal__grid">
          {actions.map(({ label, icon: Icon, path }) => (
            <button key={label} className="nox-modal-action" onClick={() => { onClose(); navigate(path); }}>
              <span><Icon size={20} /></span>
              {label}
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
    { id: 'progress', label: 'Mon NOX', path: '/progress' },
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
    <div className="nox-home">
      <style>{`.nox-home {
  --home-bg: #f3f1e9;
  --home-card: #fffef9;
  --home-ink: #11120f;
  --home-muted: #777b72;
  --home-line: #dfddd3;
  --home-lime: #c8ff00;
  --home-lime-soft: #efffc0;
  min-height: 100vh;
  background:
    radial-gradient(circle at 8% 0%, rgba(200,255,0,.10), transparent 25rem),
    var(--home-bg);
  color: var(--home-ink);
  padding-bottom: 96px;
}

.nox-home button { color: inherit; }
.nox-home button:focus-visible { outline-color: #89ad00; }

.nox-desktop-header {
  width: min(1180px, calc(100% - 48px));
  height: 78px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  border-bottom: 1px solid rgba(17,18,15,.08);
}
.nox-brand {
  border: 0; background: transparent; cursor: pointer;
  width: max-content; padding: 0;
  font-size: 26px; font-weight: 950; letter-spacing: -.06em;
}
.nox-brand span { color: #9ed100; }
.nox-desktop-header__nav { display: flex; align-items: center; gap: 8px; }
.nox-desktop-header__nav button {
  border: 0; background: transparent; cursor: pointer;
  padding: 10px 13px; border-radius: 999px;
  color: #6e7269; font-size: 13px; font-weight: 800;
}
.nox-desktop-header__nav button:hover,
.nox-desktop-header__nav button.is-active { background: rgba(17,18,15,.06); color: var(--home-ink); }
.nox-header-add {
  justify-self: end; display: flex; align-items: center; gap: 7px;
  border: 1px solid #d9d7ce; background: #fffef9; cursor: pointer;
  padding: 10px 14px; border-radius: 14px; font-weight: 850; font-size: 12px;
}
.nox-mobile-header { display: none; }

.nox-home__shell { width: min(1180px, calc(100% - 48px)); margin: 0 auto; padding: 54px 0 72px; }
.nox-hero { display: flex; justify-content: space-between; align-items: end; margin-bottom: 28px; }
.nox-hello { color: #555950; font-size: 15px; font-weight: 750; margin-bottom: 7px; }
.nox-hello span { font-size: 16px; }
.nox-hero h1 { margin: 0; font-size: clamp(46px, 6vw, 82px); line-height: .86; letter-spacing: -.075em; font-weight: 1000; }
.nox-date { margin-top: 14px; color: #8a8d84; font-size: 11px; letter-spacing: .08em; font-weight: 900; }
.nox-hero__aside { color: #8a8d84; font-size: 13px; line-height: 1.45; font-weight: 700; text-align: right; padding-bottom: 5px; }

.nox-eyebrow { font-size: 10px; font-weight: 1000; letter-spacing: .11em; color: #74786f; }
.nox-eyebrow--lime { color: var(--home-lime); }

.nox-start-card {
  min-height: 260px; border-radius: 30px; padding: 34px;
  background: #10110f; color: #fff; display: flex;
  align-items: end; justify-content: space-between; gap: 30px;
  box-shadow: 0 28px 70px rgba(16,17,15,.14);
}
.nox-start-card h2 { margin: 10px 0 8px; font-size: 36px; letter-spacing: -.045em; }
.nox-start-card p { max-width: 560px; color: #bfc3b9; line-height: 1.55; }
.nox-primary-button, .nox-priority-cta {
  border: 0; cursor: pointer; background: var(--home-lime); color: #10110f !important;
  min-height: 54px; border-radius: 15px; padding: 0 18px;
  display: inline-flex; align-items: center; justify-content: center; gap: 7px;
  font-size: 11px; font-weight: 1000; letter-spacing: .02em;
}

.nox-pulse-card {
  position: relative; overflow: hidden;
  min-height: 240px; border-radius: 30px; background: #10110f; color: #fff;
  display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(260px, .75fr);
  box-shadow: 0 26px 65px rgba(16,17,15,.14);
}
.nox-pulse-card__content { padding: 30px 34px; position: relative; z-index: 2; }
.nox-pulse-card__headline { display: flex; align-items: end; gap: 20px; margin-top: 16px; }
.nox-pulse-card__headline strong { font-size: 50px; line-height: .9; letter-spacing: -.06em; }
.nox-pulse-card__headline span { color: #777c73; font-size: 18px; font-weight: 900; }
.nox-pulse-card__headline p { max-width: 290px; color: #9ca198; font-size: 12px; line-height: 1.45; padding-bottom: 3px; }
.nox-pulse-metrics { display: flex; gap: 9px; margin-top: 23px; }
.nox-pulse-metrics > div {
  min-width: 112px; border: 1px solid #2d2f2b; background: #171815;
  border-radius: 13px; padding: 10px 12px; display: flex; justify-content: space-between; gap: 14px;
}
.nox-pulse-metrics span { color: #8d9288; font-size: 10px; font-weight: 800; }
.nox-pulse-metrics b { color: #fff; font-size: 11px; }
.nox-pulse-card__orb {
  position: relative;
  min-width: 0;
  overflow: hidden;
  background: #10110f;
}

.nox-orb { width: 160px; height: 160px; position: relative; display: grid; place-items: center; filter: drop-shadow(0 0 20px rgba(200,255,0,.16)); }
.nox-orb--compact { width: 125px; height: 125px; }
.nox-orb__ring { position: absolute; border-radius: 50%; border: 1px solid rgba(200,255,0,.48); }
.nox-orb__ring--one { inset: 10%; transform: rotate(13deg) scaleX(.82); }
.nox-orb__ring--two { inset: 18%; transform: rotate(-28deg) scaleY(.78); border-color: rgba(200,255,0,.34); }
.nox-orb__ring--three { inset: 28%; border-color: rgba(200,255,0,.25); box-shadow: inset 0 0 20px rgba(200,255,0,.08); }
.nox-orb__core { width: 11px; height: 11px; border-radius: 50%; background: var(--home-lime); box-shadow: 0 0 18px var(--home-lime); }
@media (prefers-reduced-motion: no-preference) {
  .nox-orb__ring--one { animation: nox-orbit 9s linear infinite; }
  .nox-orb__ring--two { animation: nox-orbit-reverse 12s linear infinite; }
}
@keyframes nox-orbit { to { transform: rotate(373deg) scaleX(.82); } }
@keyframes nox-orbit-reverse { to { transform: rotate(-388deg) scaleY(.78); } }

.nox-priority-card {
  margin-top: 18px; min-height: 270px; border-radius: 30px; overflow: hidden;
  display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(280px, .65fr);
  background: var(--home-lime-soft); border: 1px solid #dceca9;
}
.nox-priority-card--none { background: #fffef9; border-color: var(--home-line); }
.nox-priority-card.is-closed { background: #f2f0e7; border-color: var(--home-line); }
.nox-priority-card.is-closed .nox-priority-visual { opacity: .55; filter: saturate(.45); }
.nox-priority-card.is-closed .nox-priority-card__action { color: #777b72; }
.nox-priority-card__copy { padding: 27px 34px; display: flex; flex-direction: column; align-items: flex-start; }
.nox-priority-card__top { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 14px; }
.nox-confidence { border: 1px solid rgba(17,18,15,.12); border-radius: 999px; padding: 6px 9px; font-size: 8px; font-weight: 950; letter-spacing: .06em; color: #6d7168; }
.nox-priority-card h2 { margin: 15px 0 7px; font-size: clamp(31px, 3.4vw, 52px); line-height: .94; letter-spacing: -.06em; max-width: 680px; }
.nox-priority-card__action { color: #4f554a; font-size: 15px; line-height: 1.5; font-weight: 650; max-width: 620px; }
.nox-evidence-row { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 13px; }
.nox-evidence-row span { background: rgba(255,255,255,.55); border: 1px solid rgba(17,18,15,.08); padding: 7px 9px; border-radius: 10px; font-size: 10px; color: #686d63; }
.nox-evidence-row b { color: #171914; margin-right: 3px; }
.nox-why { margin-top: 13px; width: min(620px, 100%); }
.nox-why summary { cursor: pointer; list-style: none; font-size: 10px; font-weight: 1000; letter-spacing: .08em; }
.nox-why summary::-webkit-details-marker { display: none; }
.nox-why p { margin-top: 9px; font-size: 12px; color: #686d63; line-height: 1.5; }
.nox-priority-cta { margin-top: 15px; background: #11120f; color: #fff !important; }
.nox-priority-visual { position: relative; display: grid; place-items: center; background: linear-gradient(145deg, rgba(17,18,15,.03), rgba(17,18,15,.10)); overflow: hidden; }
.nox-priority-visual__halo { position: absolute; width: 280px; height: 280px; border-radius: 50%; background: radial-gradient(circle, rgba(200,255,0,.34), transparent 68%); }
.nox-priority-visual__label { position: absolute; bottom: 25px; font-size: 9px; font-weight: 1000; letter-spacing: .15em; color: #676d5f; }

.nox-lower-grid { display: grid; grid-template-columns: 1.15fr .85fr; gap: 18px; margin-top: 18px; }
.nox-quick-card, .nox-day-card { background: #fffef9; border: 1px solid var(--home-line); border-radius: 26px; padding: 25px; }
.nox-section-heading { display: flex; justify-content: space-between; align-items: center; gap: 20px; }
.nox-section-heading h3, .nox-day-card h3 { margin-top: 7px; font-size: 21px; letter-spacing: -.035em; }
.nox-round-plus { width: 40px; height: 40px; border-radius: 13px; border: 0; background: #11120f; color: var(--home-lime) !important; display: grid; place-items: center; cursor: pointer; }
.nox-quick-actions { display: grid; grid-template-columns: repeat(4, 1fr); gap: 9px; margin-top: 20px; }
.nox-quick-actions button { border: 1px solid #e3e1d8; background: #f8f7f1; border-radius: 16px; padding: 14px; text-align: left; cursor: pointer; min-width: 0; }
.nox-quick-actions button:hover { transform: translateY(-1px); border-color: #cdd0c4; }
.nox-quick-actions button > span { width: 34px; height: 34px; border-radius: 11px; background: #fff; display: grid; place-items: center; margin-bottom: 14px; }
.nox-quick-actions b { display: block; font-size: 12px; }
.nox-quick-actions small { display: block; margin-top: 3px; color: #969990; font-size: 9px; line-height: 1.3; }

.nox-day-card > p { margin-top: 9px; color: #7a7e75; font-size: 12px; line-height: 1.5; }
.nox-completion-buttons { display: grid; grid-template-columns: repeat(3, 1fr); gap: 7px; margin-top: 20px; }
.nox-completion-buttons button { border: 1px solid #dddbd2; background: #f7f6f0; border-radius: 12px; padding: 11px 8px; font-size: 10px; font-weight: 900; cursor: pointer; }
.nox-completion-buttons button.is-selected { background: var(--home-lime); border-color: #b9e700; }
.nox-cancel-edit { border: 0; background: transparent; margin-top: 12px; font-size: 9px; font-weight: 900; color: #8a8e84; cursor: pointer; }
.nox-day-card__done { display: flex; align-items: center; gap: 12px; }
.nox-day-card__done > span { width: 42px; height: 42px; border-radius: 13px; display: grid; place-items: center; background: var(--home-lime); }
.nox-energy { margin-top: 18px; padding-top: 16px; border-top: 1px solid #ebe9e0; display: flex; justify-content: space-between; align-items: center; gap: 10px; }
.nox-energy > span { font-size: 10px; font-weight: 850; color: #73776e; }
.nox-energy > div { display: flex; gap: 4px; }
.nox-energy button { width: 28px; height: 28px; border-radius: 9px; border: 1px solid #dfddd4; background: #f7f6f0; font-size: 9px; font-weight: 900; cursor: pointer; }
.nox-energy button.is-selected { background: #11120f; color: var(--home-lime) !important; border-color: #11120f; }
.nox-text-button { margin-top: 14px; border: 0; background: transparent; cursor: pointer; padding: 0; font-size: 9px; font-weight: 1000; letter-spacing: .06em; color: #656a60 !important; display: inline-flex; align-items: center; gap: 3px; }
.nox-text-button--dark { color: #b8bdb3 !important; }

.nox-modal-backdrop { position: fixed; inset: 0; z-index: 1000; background: rgba(8,9,7,.48); backdrop-filter: blur(10px); display: flex; align-items: flex-end; justify-content: center; padding: 20px; }
.nox-modal { width: min(620px, 100%); background: #fffef9; color: #11120f; border-radius: 28px; padding: 12px 22px 24px; box-shadow: 0 35px 90px rgba(0,0,0,.24); }
.nox-modal__handle { width: 42px; height: 4px; border-radius: 99px; background: #d7d5cc; margin: 0 auto 17px; }
.nox-modal__header { display: flex; justify-content: space-between; align-items: start; gap: 20px; }
.nox-modal__header h2 { margin-top: 5px; font-size: 25px; letter-spacing: -.045em; }
.nox-icon-button { width: 42px; height: 42px; border-radius: 13px; border: 1px solid #dfddd4; background: #fffef9; display: grid; place-items: center; cursor: pointer; }
.nox-modal__grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-top: 20px; }
.nox-modal-action { border: 1px solid #e2e0d7; background: #f7f6f0; border-radius: 16px; padding: 14px 10px; cursor: pointer; font-size: 10px; font-weight: 850; }
.nox-modal-action span { width: 34px; height: 34px; margin: 0 auto 9px; border-radius: 11px; display: grid; place-items: center; background: #fff; }

.nox-mobile-nav { display: none; }

@media (max-width: 820px) {
  .nox-home { padding-bottom: 104px; }
  .nox-desktop-header { display: none; }
  .nox-mobile-header { height: 70px; padding: 0 18px; display: flex; justify-content: space-between; align-items: center; }
  .nox-home__shell { width: 100%; padding: 22px 16px 40px; }
  .nox-hero { margin-bottom: 20px; }
  .nox-hero h1 { font-size: 46px; }
  .nox-hero__aside { display: none; }
  .nox-hello { font-size: 13px; }
  .nox-date { margin-top: 9px; font-size: 9px; }

  .nox-pulse-card { min-height: 205px; grid-template-columns: 1fr 130px; border-radius: 24px; }
  .nox-pulse-card__content { padding: 22px 20px; }
  .nox-pulse-card__headline { margin-top: 13px; }
  .nox-pulse-card__headline strong { font-size: 40px; }
  .nox-pulse-card__headline p { display: none; }
  .nox-pulse-metrics { gap: 5px; margin-top: 17px; }
  .nox-pulse-metrics > div { min-width: 0; flex: 1; padding: 8px; display: block; }
  .nox-pulse-metrics span { display: block; margin-bottom: 3px; font-size: 8px; }
  .nox-pulse-card__orb { overflow: hidden; }
  .nox-text-button--dark { margin-top: 12px; }

  .nox-priority-card { min-height: 0; grid-template-columns: 1fr; border-radius: 24px; }
  .nox-priority-card__copy { padding: 24px 20px 20px; }
  .nox-priority-card h2 { margin-top: 18px; font-size: 34px; }
  .nox-priority-card__action { font-size: 13px; }
  .nox-confidence { font-size: 7px; padding: 5px 7px; }
  .nox-priority-visual { display: none; }
  .nox-priority-cta { width: 100%; }

  .nox-lower-grid { grid-template-columns: 1fr; }
  .nox-quick-card, .nox-day-card { border-radius: 22px; padding: 20px; }
  .nox-quick-actions { grid-template-columns: repeat(4, 1fr); }
  .nox-quick-actions button { padding: 11px 8px; }
  .nox-quick-actions button > span { margin-bottom: 10px; }
  .nox-quick-actions small { display: none; }

  .nox-mobile-nav {
    position: fixed; z-index: 500; left: 50%; bottom: 0; transform: translateX(-50%);
    width: 100%; height: 72px; padding: 7px 12px max(8px, env(safe-area-inset-bottom));
    display: flex; align-items: center; justify-content: space-around;
    background: rgba(255,254,249,.94); backdrop-filter: blur(20px); border-top: 1px solid #dedcd3;
  }
  .nox-mobile-nav__item { flex: 1; border: 0; background: transparent; color: #999c94 !important; font-size: 9px; font-weight: 850; cursor: pointer; }
  .nox-mobile-nav__item.is-active { color: #11120f !important; }
  .nox-mobile-nav__plus { width: 50px; height: 50px; border: 0; border-radius: 17px; background: var(--home-lime); color: #11120f !important; display: grid; place-items: center; transform: translateY(-13px); box-shadow: 0 10px 24px rgba(170,218,0,.28); cursor: pointer; }

  .nox-modal-backdrop { padding: 0; }
  .nox-modal { border-radius: 28px 28px 0 0; padding-bottom: max(28px, env(safe-area-inset-bottom)); }
  .nox-modal__grid { grid-template-columns: repeat(3, 1fr); }
}

@media (max-width: 430px) {
  .nox-pulse-card { grid-template-columns: 1fr 105px; }
  .nox-pulse-metrics > div { padding: 7px 6px; }
  .nox-pulse-metrics b { font-size: 10px; }
  .nox-priority-card__top { align-items: flex-start; }
  .nox-quick-actions { gap: 6px; }
  .nox-quick-actions b { font-size: 10px; }
}

@media (min-width: 821px) {
  .nox-home { padding-bottom: 0; }
}
`}</style>
      <QuickAddModal open={showAdd} onClose={() => setShowAdd(false)} />

      <header className="nox-desktop-header">
        <button className="nox-brand" onClick={() => navigate('/home')}>NOX<span>.</span></button>
        <nav className="nox-desktop-header__nav">
          <button className="is-active" onClick={() => navigate('/home')}>Aujourd’hui</button>
          <button onClick={() => navigate('/fuel')}>Nutrition</button>
          <button onClick={() => navigate('/progress')}>Mon NOX</button>
          <button onClick={() => navigate('/profile')}>Moi</button>
        </nav>
        <button className="nox-header-add" onClick={() => setShowAdd(true)}><Plus size={18} /> Ajouter</button>
      </header>

      <div className="nox-mobile-header">
        <button className="nox-brand" onClick={() => navigate('/home')}>NOX<span>.</span></button>
        <button className="nox-icon-button" onClick={() => navigate('/profile')} aria-label="Profil"><CircleUserRound size={20} /></button>
      </div>

      <main className="nox-home__shell">
        <section className="nox-hero">
          <div>
            <p className="nox-hello">{firstName ? `Bonjour ${firstName}` : 'Bonjour'} <span>👋</span></p>
            <h1>AUJOURD’HUI</h1>
            <p className="nox-date">{dateLabel}</p>
          </div>
          <p className="nox-hero__aside">Une seule priorité.<br />Le reste peut attendre.</p>
        </section>

        {!todayPulse ? (
          <section className="nox-start-card">
            <div>
              <div className="nox-eyebrow">TON PULSE</div>
              <h2>Comment tu te sens aujourd’hui ?</h2>
              <p>3 signaux · 10 secondes · NOX choisit ensuite ce qui mérite vraiment ton attention.</p>
            </div>
            <button className="nox-primary-button" onClick={() => navigate('/pulse')}>FAIRE MON PULSE <ChevronRight size={18} /></button>
          </section>
        ) : (
          <>
            <section className="nox-pulse-card">
              <div className="nox-pulse-card__content">
                <div className="nox-eyebrow nox-eyebrow--lime">TON PULSE</div>
                <div className="nox-pulse-card__headline">
                  <div>
                    <strong>3</strong><span> signaux</span>
                  </div>
                  <p>Sommeil, énergie et corps. Pas de score global inventé.</p>
                </div>
                <div className="nox-pulse-metrics">
                  <div><span>Sommeil</span><b>{todayPulse.sleep_score}/5</b></div>
                  <div><span>Énergie</span><b>{todayPulse.energy_score}/5</b></div>
                  <div><span>Corps</span><b>{todayPulse.body_score}/5</b></div>
                </div>
                <button className="nox-text-button nox-text-button--dark" onClick={() => navigate('/pulse')}>METTRE À JOUR <ChevronRight size={15} /></button>
              </div>
              <div className="nox-pulse-card__orb"><NoxCompanion observedDays={observedDays} size="md" /></div>
            </section>

            <section className={`nox-priority-card nox-priority-card--${priority.type} ${todayClosure ? 'is-closed' : ''}`}>
              <div className="nox-priority-card__copy">
                <div className="nox-priority-card__top">
                  <div className="nox-eyebrow">{todayClosure ? 'PRIORITÉ DU JOUR · CLÔTURÉE' : 'PRIORITÉ DU JOUR'}</div>
                  <span className="nox-confidence">
                    {todayClosure
                      ? completionLabel[todayClosure.completion].toUpperCase()
                      : priority.confidence === 'high'
                        ? 'CONFIANCE ÉLEVÉE'
                        : priority.confidence === 'moderate'
                          ? 'CONFIANCE MODÉRÉE'
                          : 'CONFIANCE FAIBLE'}
                  </span>
                </div>
                <h2>{priorityTitle}</h2>
                <p className="nox-priority-card__action">{priorityAction}</p>

                {priority.evidence.length > 0 && (
                  <div className="nox-evidence-row">
                    {priority.evidence.slice(0, 3).map((item) => (
                      <span key={`${item.key}-${item.value}`}><b>{item.label}</b> {item.value}</span>
                    ))}
                  </div>
                )}

                <details className="nox-why">
                  <summary>POURQUOI ?</summary>
                  <p>{priorityReason}</p>
                </details>

                {!todayClosure && actionLabel && (
                  <button className="nox-priority-cta" onClick={mainAction}>{actionLabel} <ChevronRight size={18} /></button>
                )}
              </div>

              <div className="nox-priority-visual" aria-hidden="true">
                <div className="nox-priority-visual__halo" />
                <NoxOrb compact />
                <div className="nox-priority-visual__label">{priority.type === 'none' ? 'NOX' : priority.type.toUpperCase()}</div>
              </div>
            </section>

            <section className="nox-lower-grid">
              <div className="nox-quick-card">
                <div className="nox-section-heading">
                  <div>
                    <div className="nox-eyebrow">AJOUT RAPIDE</div>
                    <h3>Donne du contexte à NOX.</h3>
                  </div>
                  <button className="nox-round-plus" onClick={() => setShowAdd(true)}><Plus size={19} /></button>
                </div>
                <div className="nox-quick-actions">
                  <button onClick={() => navigate('/food-scan')}><span><Utensils size={19} /></span><b>Repas</b><small>Photo ou saisie</small></button>
                  <button onClick={() => navigate('/fuel')}><span><Droplets size={19} /></span><b>Eau</b><small>Hydratation</small></button>
                  <button onClick={() => navigate('/program')}><span><Dumbbell size={19} /></span><b>Activité</b><small>Séance ou mouvement</small></button>
                  <button onClick={() => navigate('/body')}><span><Scale size={19} /></span><b>Poids</b><small>Évolution corps</small></button>
                </div>
              </div>

              <div className="nox-day-card">
                {!todayClosure || editingClosure ? (
                  <>
                    <div className="nox-eyebrow">FIN DE JOURNÉE</div>
                    <h3>Tu as suivi ta priorité ?</h3>
                    <p>Une réponse suffit. NOX s’en sert pour comprendre ce qui fonctionne réellement pour toi.</p>
                    <div className="nox-completion-buttons">
                      {(['yes', 'partial', 'no'] as Completion[]).map((value) => (
                        <button
                          key={value}
                          disabled={savingClosure}
                          className={todayClosure?.completion === value ? 'is-selected' : ''}
                          onClick={() => saveClosure(value)}
                        >
                          {completionLabel[value]}
                        </button>
                      ))}
                    </div>
                    {editingClosure && <button className="nox-cancel-edit" onClick={() => setEditingClosure(false)}>ANNULER</button>}
                  </>
                ) : (
                  <>
                    <div className="nox-day-card__done">
                      <span><Activity size={18} /></span>
                      <div>
                        <div className="nox-eyebrow">JOURNÉE COMPRISE</div>
                        <h3>À demain.</h3>
                      </div>
                    </div>
                    <p>Priorité : <b>{completionLabel[todayClosure.completion]}</b>. Ton retour est enregistré.</p>
                    <div className="nox-energy">
                      <span>Énergie ce soir</span>
                      <div>
                        {[1, 2, 3, 4, 5].map((value) => (
                          <button
                            key={value}
                            className={todayClosure.evening_energy === value ? 'is-selected' : ''}
                            onClick={() => saveEnergy(value)}
                            disabled={savingClosure}
                          >{value}</button>
                        ))}
                      </div>
                    </div>
                    <button className="nox-text-button" onClick={() => setEditingClosure(true)}>MODIFIER</button>
                  </>
                )}
              </div>
            </section>
          </>
        )}
      </main>

      <BottomNav active="home" />
    </div>
  );
}
