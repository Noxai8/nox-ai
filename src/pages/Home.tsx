import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';

const ACCENT = '#c8ff00';
const BG = '#0a0a0a';
const SURFACE = '#111';
const BORDER = '#1a1a1a';

export function BottomNav({ active }: { active: string }) {
  const navigate = useNavigate();
  const items = [
    { id: 'home', label: 'Home', icon: '⚡', path: '/home' },
    { id: 'training', label: 'Train', icon: '🏋️', path: '/program' },
    { id: 'body', label: 'Body', icon: '📊', path: '/body' },
    { id: 'fuel', label: 'Fuel', icon: '🥗', path: '/fuel' },
    { id: 'future', label: 'Future', icon: '🔮', path: '/future' },
    { id: 'play', label: 'Play', icon: '🏅', path: '/play' },
    { id: 'coach', label: 'Coach', icon: '🤖', path: '/coach' },
  ];
  return (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#0d0d0d', borderTop: '1px solid #1a1a1a', display: 'flex', zIndex: 100, overflowX: 'auto' }}>
      {items.map(item => (
        <button key={item.id} onClick={() => navigate(item.path)}
          style={{ flex: 1, minWidth: 48, padding: '10px 0 14px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
          <span style={{ fontSize: 18 }}>{item.icon}</span>
          <span style={{ fontSize: 9, fontWeight: 700, color: active === item.id ? ACCENT : '#333', textTransform: 'uppercase', letterSpacing: '.04em' }}>{item.label}</span>
        </button>
      ))}
    </div>
  );
}

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [program, setProgram] = useState<any>(null);
  const [todaySession, setTodaySession] = useState<any>(null);
  const [workoutCount, setWorkoutCount] = useState(0);
  const [prCount, setPrCount] = useState(0);
  const [weekWorkouts, setWeekWorkouts] = useState(0);
  const [todayKcal, setTodayKcal] = useState(0);
  const [latestWeight, setLatestWeight] = useState<number | null>(null);
  const [xp, setXp] = useState(0);
  const [loading, setLoading] = useState(true);

  const days = ['DIM', 'LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM'];
  const todayDay = days[new Date().getDay()];
  const today = new Date().toISOString().split('T')[0];
  const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [
        { data: prof },
        { data: prog },
        { data: logs },
        { data: prs },
        { data: weekLogs },
        { data: fuel },
        { data: bodyLogs },
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
        supabase.from('workout_programs').select('*').eq('user_id', user.id).eq('is_active', true).maybeSingle(),
        supabase.from('workouts').select('id').eq('user_id', user.id).eq('status', 'completed'),
        supabase.from('personal_records').select('id').eq('user_id', user.id),
        supabase.from('workouts').select('id').eq('user_id', user.id).eq('status', 'completed').gte('created_at', weekStart),
        supabase.from('food_entries').select('calories').eq('user_id', user.id).gte('created_at', today + 'T00:00:00'),
        supabase.from('body_logs').select('weight').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1),
      ]);

      setProfile(prof);
      setProgram(prog);
      setWorkoutCount(logs?.length || 0);
      setPrCount(prs?.length || 0);
      setWeekWorkouts(weekLogs?.length || 0);
      setTodayKcal(fuel?.reduce((s: number, f: any) => s + (f.calories || 0), 0) || 0);
      setLatestWeight(bodyLogs?.[0]?.weight || null);
      setXp(prof?.xp || 0);

      if (prog?.program_json) {
        const sessions = prog.program_json.sessions || [];
        const found = sessions.find((s: any) =>
          s.day === todayDay || (s.days && s.days.includes(todayDay))
        );
        setTodaySession(found || null);
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const isRestDay = !todaySession;
  const greet = () => {
    const h = new Date().getHours();
    if (h < 12) return 'BONJOUR';
    if (h < 18) return 'BONNE APRÈS-MIDI';
    return 'BONSOIR';
  };

  const getNoxScore = () => {
    let score = 0;
    if (workoutCount > 0) score += Math.min(30, workoutCount * 3);
    if (weekWorkouts >= 3) score += 20;
    if (prCount > 0) score += Math.min(20, prCount * 4);
    if (latestWeight) score += 10;
    if (todayKcal > 0) score += 10;
    if (xp > 0) score += Math.min(10, Math.floor(xp / 100));
    return Math.min(100, score);
  };

  if (loading) return <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ color: ACCENT, fontWeight: 900, letterSpacing: '.15em' }}>NOX...</div></div>;

  const noxScore = getNoxScore();

  return (
    <div style={{ minHeight: '100vh', background: BG, paddingBottom: 90 }}>
      {/* Header */}
      <div style={{ padding: '24px 20px 20px', background: 'linear-gradient(180deg, #0d0d0d 0%, #0a0a0a 100%)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.12em' }}>{greet()}</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: '#fff', letterSpacing: '-.02em' }}>
              {profile?.display_name?.split(' ')[0] || 'ATHLÈTE'} <span style={{ color: ACCENT }}>⚡</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: ACCENT }}>{noxScore}</div>
            <div style={{ fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '.08em' }}>NOX Score</div>
          </div>
        </div>

        {/* Streak */}
        {profile?.streak_days > 0 && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#ff660011', border: '1px solid #ff660033', borderRadius: 20, padding: '6px 14px', marginTop: 12 }}>
            <span style={{ fontSize: 16 }}>🔥</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#ff6600' }}>{profile.streak_days} jours de suite</span>
          </div>
        )}
      </div>

      <div style={{ padding: '0 20px' }}>
        {/* TODAY CARD */}
        {isRestDay ? (
          <div style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 20, padding: 24, marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 8 }}>Aujourd'hui</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 8 }}>JOUR DE RÉCUPÉRATION</div>
            <div style={{ fontSize: 14, color: '#555', lineHeight: 1.5, marginBottom: 20 }}>
              Le repos fait partie du plan. Ton corps se reconstruit et progresse pendant la récupération.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => navigate('/body')} style={{ flex: 1, padding: '12px 0', background: ACCENT + '11', border: '1px solid ' + ACCENT + '44', borderRadius: 12, color: ACCENT, fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>
                📊 BODY CHECK
              </button>
              <button onClick={() => navigate('/fuel')} style={{ flex: 1, padding: '12px 0', background: 'transparent', border: '1px solid ' + BORDER, borderRadius: 12, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                🥗 NUTRITION
              </button>
            </div>
          </div>
        ) : (
          <div style={{ background: 'linear-gradient(135deg, #111 0%, #141414 100%)', border: '1px solid ' + ACCENT + '33', borderRadius: 20, padding: 24, marginBottom: 16, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -10, right: -10, width: 120, height: 120, background: ACCENT, opacity: .03, borderRadius: '50%' }} />
            <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 4 }}>Aujourd'hui — {todayDay}</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: '-.02em', marginBottom: 4 }}>
              {todaySession?.name || 'SÉANCE DU JOUR'}
            </div>
            <div style={{ fontSize: 14, color: '#555', marginBottom: 20 }}>
              {todaySession?.exercises?.length || 0} exercices · {todaySession?.duration || program?.program_json?.session_length_min || 60} min
            </div>
            <button onClick={() => navigate('/training/' + (todaySession?.id || 'today'))}
              style={{ width: '100%', padding: 16, background: ACCENT, border: 'none', borderRadius: 14, color: '#000', fontWeight: 900, fontSize: 15, cursor: 'pointer', letterSpacing: '.05em' }}>
              COMMENCER LA SÉANCE ▶
            </button>
          </div>
        )}

        {/* STATS ROW */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 16 }}>
          {[
            { label: 'Séances totales', value: workoutCount, icon: '🏋️', path: '/program' },
            { label: 'Records (PR)', value: prCount, icon: '🏆', path: '/program' },
            { label: 'Cette semaine', value: weekWorkouts + ' séances', icon: '📅', path: '/program' },
            { label: 'Calories today', value: todayKcal ? todayKcal + ' kcal' : '—', icon: '🥗', path: '/fuel' },
          ].map(({ label, value, icon, path }) => (
            <button key={label} onClick={() => navigate(path)}
              style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 16, padding: '16px 14px', textAlign: 'left', cursor: 'pointer' }}>
              <div style={{ fontSize: 20, marginBottom: 8 }}>{icon}</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#fff' }}>{value}</div>
              <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>{label}</div>
            </button>
          ))}
        </div>

        {/* NOX FUTURE promo */}
        <button onClick={() => navigate('/future')}
          style={{ width: '100%', background: 'linear-gradient(135deg, #111 0%, #0d0d0d 100%)', border: '1px solid #ffffff11', borderRadius: 20, padding: 20, marginBottom: 16, textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: 40, flexShrink: 0 }}>🔮</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 900, color: '#fff', marginBottom: 4 }}>NOX FUTURE</div>
            <div style={{ fontSize: 12, color: '#555', lineHeight: 1.4 }}>Visualise ta transformation sur 90 jours grâce à l'IA</div>
          </div>
          <div style={{ fontSize: 18, color: '#333' }}>→</div>
        </button>

        {/* QUICK ACTIONS */}
        <div style={{ fontSize: 11, fontWeight: 800, color: '#555', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 12 }}>ACCÈS RAPIDE</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
          {[
            { label: 'Programme', icon: '📋', path: '/program' },
            { label: 'BODY', icon: '📊', path: '/body' },
            { label: 'Coach IA', icon: '🤖', path: '/coach' },
          ].map(({ label, icon, path }) => (
            <button key={label} onClick={() => navigate(path)}
              style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 14, padding: '14px 8px', textAlign: 'center', cursor: 'pointer' }}>
              <div style={{ fontSize: 24, marginBottom: 6 }}>{icon}</div>
              <div style={{ fontSize: 11, color: '#888', fontWeight: 700 }}>{label}</div>
            </button>
          ))}
        </div>
      </div>

      <BottomNav active="home" />
    </div>
  );
}
