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
    { id: 'training', label: 'Training', icon: '🏋️', path: '/program' },
    { id: 'body', label: 'Body', icon: '📊', path: '/body' },
    { id: 'fuel', label: 'Fuel', icon: '🥗', path: '/fuel' },
    { id: 'coach', label: 'Coach', icon: '🤖', path: '/coach' },
  ];
  return (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#0d0d0d', borderTop: '1px solid #1a1a1a', display: 'flex', zIndex: 100 }}>
      {items.map(item => (
        <button key={item.id} onClick={() => navigate(item.path)}
          style={{ flex: 1, padding: '12px 0 16px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 20 }}>{item.icon}</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: active === item.id ? ACCENT : '#333', textTransform: 'uppercase', letterSpacing: '.05em' }}>{item.label}</span>
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
  const [loading, setLoading] = useState(true);

  const days = ['DIM','LUN','MAR','MER','JEU','VEN','SAM'];
  const todayDay = days[new Date().getDay()];

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [{ data: prof }, { data: prog }, { data: logs }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
        supabase.from('workout_programs').select('*').eq('user_id', user.id).eq('is_active', true).maybeSingle(),
        supabase.from('workouts').select('id').eq('user_id', user.id),
      ]);

      setProfile(prof);
      setProgram(prog);
      setWorkoutCount(logs?.length || 0);

      // Trouver la séance du jour dans program_json
      if (prog?.program_json?.sessions) {
        const session = prog.program_json.sessions.find((s: any) => s.day === todayDay);
        setTodaySession(session || null);
      }

      setLoading(false);
    };
    load();
  }, [user]);

  if (loading) return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 32, height: 32, border: `2px solid ${ACCENT}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Bonjour';
    if (h < 18) return 'Bon après-midi';
    return 'Bonsoir';
  };

  return (
    <div style={{ minHeight: '100vh', background: BG, paddingBottom: 90 }}>
      <div style={{ padding: '24px 20px 0' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <div style={{ fontSize: 12, color: '#444', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em' }}>{greeting()}</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: '-.02em' }}>{profile?.display_name || user?.email?.split('@')[0]}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 13, color: ACCENT, fontWeight: 800 }}>{profile?.xp || 0} XP</div>
            <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#1a1a1a', border: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 18 }} onClick={() => navigate('/settings')}>👤</div>
          </div>
        </div>

        {/* Séance du jour */}
        {todaySession ? (
          <div style={{ background: 'linear-gradient(135deg, #1a1f00, #111)', border: `1px solid rgba(200,255,0,0.2)`, borderRadius: 20, padding: 24, marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: ACCENT, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 8 }}>AUJOURD'HUI</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 4, letterSpacing: '-.02em' }}>{todaySession.name}</div>
            <div style={{ fontSize: 13, color: '#555', marginBottom: 20 }}>
              {todaySession.exercises?.length || 0} exercices
            </div>
            <button onClick={() => navigate('/training', { state: { session: todaySession, programId: program?.id } })}
              style={{ background: ACCENT, color: BG, border: 'none', borderRadius: 12, padding: '14px 24px', fontSize: 14, fontWeight: 900, cursor: 'pointer', width: '100%', letterSpacing: '.05em' }}>
              COMMENCER LA SÉANCE
            </button>
          </div>
        ) : (
          <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 20, padding: 24, marginBottom: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>😴</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', marginBottom: 4 }}>REPOS</div>
            <div style={{ fontSize: 13, color: '#444' }}>Récupère. Ton corps reconstruit.</div>
          </div>
        )}

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'Séances', value: workoutCount },
            { label: 'Streak', value: profile?.streak_days || 0, unit: 'j' },
            { label: 'XP', value: profile?.xp || 0 },
          ].map(s => (
            <div key={s.label} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: '16px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#fff' }}>{s.value}<span style={{ fontSize: 12, color: '#444' }}>{s.unit || ''}</span></div>
              <div style={{ fontSize: 11, color: '#444', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { label: 'Mon programme', icon: '📋', path: '/program' },
            { label: 'Body & mensurations', icon: '📊', path: '/body' },
            { label: 'Nutrition', icon: '🥗', path: '/fuel' },
            { label: 'Coach NOX', icon: '🤖', path: '/coach' },
          ].map(a => (
            <button key={a.label} onClick={() => navigate(a.path)} style={{
              background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: '18px 16px',
              textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <span style={{ fontSize: 22 }}>{a.icon}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{a.label}</span>
            </button>
          ))}
        </div>
      </div>
      <BottomNav active="home" />
    </div>
  );
}
