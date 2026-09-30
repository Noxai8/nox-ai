import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import {
  Beef, Camera, Check, ChevronRight, CircleUserRound,
  Droplets, Dumbbell, Flame, Moon, Plus, Ruler, Scale,
  ScanLine, Utensils, X,
} from 'lucide-react';
import { generateDailyPriority, type DailyPriority } from '../lib/nox/priorityEngine';
import { todayLocalDate } from '../lib/localDate';

const ACCENT = '#C8FF00';
const BG     = '#F7F8F4';
const WHITE  = '#FFFFFF';
const BLACK  = '#0B0B0B';
const MUTED  = '#7A7F76';
const BORDER = '#E8EAE4';
const LIME   = '#F0FFD0';

type NavActive = 'home' | 'nutrition' | 'progress' | 'moi';

export function BottomNav({ active }: { active: NavActive | string }) {
  const navigate = useNavigate();
  const [showAdd, setShowAdd] = useState(false);

  const quickActions = [
    { label: 'Scanner un repas',  icon: Camera,   path: '/food-scan' },
    { label: 'Ajouter un aliment',icon: Utensils, path: '/fuel' },
    { label: 'Eau',               icon: Droplets, path: '/fuel' },
    { label: 'Poids',             icon: Scale,    path: '/body' },
    { label: 'Mensurations',      icon: Ruler,    path: '/body' },
    { label: 'Code-barres',       icon: ScanLine, path: '/barcode-scanner' },
    { label: 'Entrainement',      icon: Dumbbell, path: '/program' },
    { label: 'Photo',             icon: Camera,   path: '/progress' },
  ];

  const tabs = [
    { id: 'home',      label: "Aujourd'hui", path: '/home' },
    { id: 'nutrition', label: 'Nutrition',    path: '/fuel' },
    { id: 'plus',      label: '',             path: '' },
    { id: 'progress',  label: 'Progres',      path: '/progress' },
    { id: 'moi',       label: 'Moi',          path: '/profile' },
  ];

  return (
    <>
      {showAdd && (
        <div onClick={() => setShowAdd(false)} style={{
          position: 'fixed', inset: 0, zIndex: 300,
          background: 'rgba(0,0,0,.45)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            width: '100%', maxWidth: 560, background: WHITE,
            borderRadius: '28px 28px 0 0',
            padding: '10px 20px max(32px, env(safe-area-inset-bottom))',
            boxSizing: 'border-box', maxHeight: '80vh', overflowY: 'auto',
          }}>
            <div style={{ width: 40, height: 5, borderRadius: 99, background: '#D8DAD3', margin: '2px auto 20px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 900, color: MUTED, letterSpacing: '.1em' }}>AJOUT RAPIDE</div>
                <div style={{ fontSize: 26, fontWeight: 950, letterSpacing: '-.04em', color: BLACK, marginTop: 2 }}>Que veux-tu ajouter ?</div>
              </div>
              <button onClick={() => setShowAdd(false)} style={{ width: 42, height: 42, borderRadius: 14, border: `1px solid ${BORDER}`, background: BG, color: BLACK, display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {quickActions.map(a => {
                const Icon = a.icon;
                return (
                  <button key={a.label} onClick={() => { setShowAdd(false); navigate(a.path); }} style={{
                    border: `1px solid ${BORDER}`, background: BG, borderRadius: 20,
                    minHeight: 100, padding: 14, textAlign: 'left', cursor: 'pointer',
                  }}>
                    <div style={{ width: 36, height: 36, borderRadius: 12, background: WHITE, display: 'grid', placeItems: 'center', marginBottom: 12 }}>
                      <Icon size={18} />
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: BLACK, lineHeight: 1.3 }}>{a.label}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 560, zIndex: 200,
        background: 'rgba(255,255,255,.97)', backdropFilter: 'blur(20px)',
        borderTop: `1px solid ${BORDER}`,
        padding: '7px 16px max(10px, env(safe-area-inset-bottom))',
        boxSizing: 'border-box',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {tabs.map(tab => {
            if (tab.id === 'plus') {
              return (
                <button key="plus" onClick={() => setShowAdd(true)} style={{
                  width: 52, height: 52, borderRadius: 18, border: 0,
                  background: ACCENT, color: BLACK,
                  display: 'grid', placeItems: 'center',
                  cursor: 'pointer', transform: 'translateY(-14px)',
                  boxShadow: '0 8px 22px rgba(200,255,0,.4)',
                  flexShrink: 0,
                }}>
                  <Plus size={26} strokeWidth={3} />
                </button>
              );
            }
            const sel = active === tab.id ||
              (tab.id === 'nutrition' && active === 'fuel') ||
              (tab.id === 'moi' && (active === 'settings' || active === 'profile'));
            return (
              <button key={tab.id} onClick={() => navigate(tab.path)} style={{
                flex: 1, border: 0, background: 'transparent',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                color: sel ? BLACK : '#A0A49B', cursor: 'pointer', padding: '6px 0',
              }}>
                <span style={{ fontSize: 9, fontWeight: sel ? 900 : 700, whiteSpace: 'nowrap' }}>{tab.label}</span>
                <div style={{ width: sel ? 16 : 0, height: 3, borderRadius: 99, background: ACCENT, transition: 'width .2s' }} />
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

function NoxCore({ pct }: { pct: number }) {
  const safe = Math.max(0, Math.min(100, pct));
  const r = 46, circ = 2 * Math.PI * r, dash = (safe / 100) * circ;
  return (
    <div style={{ position: 'relative', width: 120, height: 120, flexShrink: 0 }}>
      <svg width="120" height="120" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="60" cy="60" r={r} fill="none" stroke="#1a1a1a" strokeWidth="8" />
        <circle cx="60" cy="60" r={r} fill="none" stroke={ACCENT} strokeWidth="8"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray .6s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 26, fontWeight: 950, color: WHITE, lineHeight: 1 }}>{safe}%</div>
        <div style={{ fontSize: 8, fontWeight: 900, color: MUTED, letterSpacing: '.1em', marginTop: 2 }}>TA JOURNÉE</div>
      </div>
    </div>
  );
}

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile]       = useState<any>(null);
  const [program, setProgram]       = useState<any>(null);
  const [targets, setTargets]       = useState<any>(null);
  const [todayFood, setTodayFood]   = useState<any[]>([]);
  const [sleepData, setSleepData]   = useState<any>(null);
  const [todayWorkout, setTodayWorkout] = useState<any>(null);
  const [todayPulse, setTodayPulse]         = useState<any>(null);
  const [daysSinceActivity, setDaysSinceActivity] = useState<number | null>(null);
  const [habitDone, setHabitDone]   = useState(0);
  const [habitTotal, setHabitTotal] = useState(4);

  useEffect(() => { if (user) loadAll(); }, [user]);

  const loadAll = async () => {
    if (!user) return;
    const now   = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const end   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();
    const [{ data: prof }, { data: prog }, { data: tgts }, { data: food }, { data: sleep }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
      supabase.from('workout_programs').select('*').eq('user_id', user.id).eq('is_active', true).maybeSingle(),
      supabase.from('nutrition_targets').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('food_entries').select('calories, protein').eq('user_id', user.id).gte('created_at', start).lte('created_at', end),
      supabase.from('sleep_logs').select('duration_hours, quality').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]);
    setProfile(prof); setProgram(prog); setTargets(tgts); setTodayFood(food || []);
    setSleepData(sleep || null);
    // Séance terminée aujourd'hui
    const { data: workout } = await supabase
      .from('workouts')
      .select('id, name, status, finished_at, duration_minutes, session_feedback')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .gte('finished_at', start)
      .lte('finished_at', end)
      .order('finished_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setTodayWorkout(workout || null);
    // Dernière activité complétée (pour days_since_last_activity)
    const { data: lastActivity } = await supabase
      .from('workouts')
      .select('finished_at')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .not('finished_at', 'is', null)
      .order('finished_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (lastActivity?.finished_at) {
      const msPerDay = 1000 * 60 * 60 * 24;
      const diff = Math.floor((Date.now() - new Date(lastActivity.finished_at).getTime()) / msPerDay);
      setDaysSinceActivity(diff);
    } else {
      setDaysSinceActivity(null);
    }
    // Pulse du jour
    const { data: pulse } = await supabase
      .from('daily_pulses')
      .select('sleep_score, energy_score, body_score')
      .eq('user_id', user.id)
      .eq('date', todayLocalDate())
      .maybeSingle();
    setTodayPulse(pulse || null);
    // Habitudes du jour depuis localStorage
    try {
      const d = new Date();
      const key = `nox-habits-${user.id}-${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const saved = localStorage.getItem(key);
      const done = saved ? JSON.parse(saved) : [];
      setHabitDone(done.length);
    } catch {}
  };

  const firstName        = profile?.first_name || profile?.display_name?.split(' ')[0] || '';
  const caloriesTarget   = Number(targets?.calories || 2200);
  const proteinTarget    = Number(targets?.protein_g || targets?.protein || 160);
  const todayKcal        = todayFood.reduce((s, e) => s + (e.calories || 0), 0);
  const todayProt        = todayFood.reduce((s, e) => s + (e.protein  || 0), 0);
  const kcalLeft         = Math.max(0, caloriesTarget - Math.round(todayKcal));
  const kcalPct          = Math.min(100, Math.round((todayKcal  / caloriesTarget) * 100));
  const protPct          = Math.min(100, Math.round((todayProt  / proteinTarget)  * 100));
  const sessions         = program?.program_json?.sessions || [];
  const dayNames         = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
  const todaySession     = sessions.find((s: any) =>
    String(s?.day || '').toLowerCase().includes(dayNames[new Date().getDay()].toLowerCase().slice(0,3))
  ) || null;

  const priority: DailyPriority = generateDailyPriority({
    pulse: todayPulse
      ? { sleep_score: Number(todayPulse.sleep_score), energy_score: Number(todayPulse.energy_score), body_score: Number(todayPulse.body_score) }
      : null,
    profile: { goal_type: profile?.goal_type ?? null },
    recentActivity: {
      session_planned_today: Boolean(todaySession) && !Boolean(todayWorkout),
      last_session_feedback: todayWorkout?.session_feedback === 'hard' ? 'hard'
        : todayWorkout?.session_feedback === 'easy' ? 'easy'
        : todayWorkout?.session_feedback ? 'good' : null,
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
  });
  // NOX Core — score explicable : nutrition 50% + protéines 30% + séance 20%
  const sessionDone  = Boolean(todayWorkout);
  const sessionScore = todaySession ? (sessionDone ? 20 : 10) : 20;

  const hasNutritionData   = todayFood.length > 0;
  const hasSleepData       = Boolean(sleepData?.duration_hours);
  const hasWorkoutData     = Boolean(todayWorkout);
  const availableSignals   = [hasNutritionData, hasSleepData, hasWorkoutData, habitDone > 0].filter(Boolean).length;
  const hasEnoughDataForScore = availableSignals >= 2;

  const calculatedNoxPct = Math.min(100, Math.round((kcalPct * 0.5) + (protPct * 0.3) + sessionScore));
  const noxPct = hasEnoughDataForScore ? calculatedNoxPct : null;
  const dateLabel = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date()).toUpperCase();


  return (
    <div style={{ minHeight: '100vh', background: BG, color: BLACK, paddingBottom: 110 }}>
      <div style={{ width: '100%', maxWidth: 560, margin: '0 auto' }}>

        <header style={{ padding: '22px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 950, letterSpacing: '-.04em' }}>NOX<span style={{ color: '#9ED100' }}>.</span></div>
          <button onClick={() => navigate('/profile')} style={{ width: 42, height: 42, borderRadius: 14, border: `1px solid ${BORDER}`, background: WHITE, color: BLACK, display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
            <CircleUserRound size={20} />
          </button>
        </header>

        <main style={{ padding: '20px 20px 0' }}>

          {/* HEADER */}
          <header style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 14, fontWeight: 750, color: '#555950', marginBottom: 4 }}>
              {firstName ? `Bonjour ${firstName} 👋` : 'Bonjour 👋'}
            </div>
            <h1 style={{ margin: 0, fontSize: 40, lineHeight: .92, fontWeight: 1000, letterSpacing: '-.055em', color: BLACK }}>
              AUJOURD'HUI
            </h1>
            <div style={{ marginTop: 7, fontSize: 13, color: '#7B8076', fontWeight: 700 }}>{dateLabel}</div>
          </header>

          {/* PRIORITÉ NOX */}
          {todayPulse && (
            <section style={{
              background: priority.type === 'none' ? WHITE : BLACK,
              color: priority.type === 'none' ? BLACK : WHITE,
              border: priority.type === 'none' ? `1px solid ${BORDER}` : 'none',
              borderRadius: 26, padding: '22px 20px', marginBottom: 14,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 1000, letterSpacing: '.09em', color: priority.type === 'none' ? MUTED : ACCENT }}>
                  TA PRIORITÉ
                </div>
                <div style={{ padding: '6px 9px', borderRadius: 99, background: priority.type === 'none' ? BG : 'rgba(255,255,255,.1)', fontSize: 9, fontWeight: 900, letterSpacing: '.04em', color: priority.type === 'none' ? MUTED : '#D5D8D0' }}>
                  CONFIANCE {priority.confidence === 'high' ? 'ÉLEVÉE' : priority.confidence === 'moderate' ? 'MODÉRÉE' : 'FAIBLE'}
                </div>
              </div>

              <div style={{ fontSize: 29, lineHeight: 1.02, fontWeight: 1000, letterSpacing: '-.045em', marginBottom: 10 }}>
                {priority.type === 'none' ? 'Tout va bien' : (priority as any).title}
              </div>

              <div style={{ fontSize: 14, lineHeight: 1.5, fontWeight: 650, color: priority.type === 'none' ? '#555A51' : '#C9CDC4' }}>
                {priority.type === 'none' ? priority.reason : (priority as any).action}
              </div>

              <details style={{ marginTop: 18, borderTop: priority.type === 'none' ? `1px solid ${BORDER}` : '1px solid rgba(255,255,255,.13)', paddingTop: 15 }}>
                <summary style={{ cursor: 'pointer', fontSize: 11, fontWeight: 1000, letterSpacing: '.04em', color: priority.type === 'none' ? BLACK : ACCENT }}>
                  POURQUOI ?
                </summary>
                <div style={{ marginTop: 13, fontSize: 13, lineHeight: 1.5, color: priority.type === 'none' ? '#555A51' : '#C9CDC4' }}>
                  {priority.type !== 'none' ? (priority as any).reason : 'Tes signaux du matin ne montrent aucune zone qui nécessite une intervention aujourd\'hui.'}
                </div>
                {priority.evidence.length > 0 && (
                  <div style={{ display: 'grid', gap: 8, marginTop: 13 }}>
                    {priority.evidence.map((ev) => (
                      <div key={`${ev.key}-${ev.value}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 14, padding: '10px 12px', borderRadius: 13, background: priority.type === 'none' ? BG : 'rgba(255,255,255,.08)' }}>
                        <span style={{ fontSize: 11, fontWeight: 750, color: priority.type === 'none' ? MUTED : '#AEB3A9' }}>{ev.label}</span>
                        <span style={{ fontSize: 11, fontWeight: 1000 }}>{ev.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </details>

              {priority.type === 'activity' && todaySession && (
                <button onClick={() => navigate('/program')} style={{ width: '100%', height: 56, marginTop: 18, border: 0, borderRadius: 17, background: ACCENT, color: BLACK, fontSize: 12, fontWeight: 1000, cursor: 'pointer' }}>
                  COMMENCER MA SÉANCE →
                </button>
              )}
              {priority.type === 'nutrition' && (
                <button onClick={() => navigate('/fuel')} style={{ width: '100%', height: 56, marginTop: 18, border: 0, borderRadius: 17, background: ACCENT, color: BLACK, fontSize: 12, fontWeight: 1000, cursor: 'pointer' }}>
                  AJOUTER MON REPAS →
                </button>
              )}
            </section>
          )}

          {!todayPulse && (
            <section style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 26, padding: '22px 20px', marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 1000, letterSpacing: '.09em', color: MUTED, marginBottom: 12 }}>TON PULSE</div>
              <div style={{ fontSize: 18, fontWeight: 950, marginBottom: 8 }}>Commence ta journée</div>
              <div style={{ fontSize: 13, color: MUTED, marginBottom: 16 }}>3 signaux · 10 secondes · NOX comprend ton état du jour.</div>
              <button onClick={() => navigate('/pulse')} style={{ width: '100%', padding: 16, border: 0, borderRadius: 16, background: BLACK, color: ACCENT, fontWeight: 1000, fontSize: 13, cursor: 'pointer' }}>
                FAIRE MON PULSE →
              </button>
            </section>
          )}

        </main>
      </div>
      <BottomNav active="home" />
    </div>
  );
}
