import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { BottomNav } from './Home';

const ACCENT = '#c8ff00';
const BG = '#0a0a0a';
const SURFACE = '#111';
const BORDER = '#1a1a1a';

const ACHIEVEMENTS = [
  { id: 'first_workout', icon: '🏅', title: 'Première séance', desc: 'Tu as complété ta première séance', xp: 50 },
  { id: 'first_pr', icon: '🏆', title: 'Premier PR', desc: 'Tu as établi ton premier record personnel', xp: 100 },
  { id: 'week_streak', icon: '🔥', title: '7 jours de suite', desc: 'Une semaine de régularité', xp: 200 },
  { id: 'workouts_10', icon: '💪', title: '10 séances', desc: 'Tu as enchaîné 10 séances', xp: 150 },
  { id: 'workouts_50', icon: '⚡', title: '50 séances', desc: 'Un vrai athlète NOX', xp: 500 },
  { id: 'workouts_100', icon: '🌟', title: '100 séances', desc: 'La légende NOX', xp: 1000 },
  { id: 'pr_5', icon: '🎯', title: '5 records', desc: 'Tu as battu 5 records personnels', xp: 250 },
  { id: 'body_checkin', icon: '📊', title: 'Check-in BODY', desc: 'Premier suivi de ta progression', xp: 75 },
  { id: 'fuel_day', icon: '🥗', title: 'Journée FUEL', desc: 'Premier jour de tracking nutrition', xp: 75 },
  { id: 'month_streak', icon: '🏆', title: '30 jours actif', desc: 'Un mois complet avec NOX', xp: 500 },
];

const LEVELS = [
  { level: 1, name: 'NOVICE', minXp: 0, color: '#555' },
  { level: 2, name: 'DÉBUTANT', minXp: 200, color: '#4488ff' },
  { level: 3, name: 'ATHLÈTE', minXp: 500, color: '#44cc88' },
  { level: 4, name: 'PERFORMER', minXp: 1000, color: '#ffaa00' },
  { level: 5, name: 'ÉLITE', minXp: 2000, color: '#ff4444' },
  { level: 6, name: 'LÉGENDE NOX', minXp: 5000, color: ACCENT },
];

function getLevel(xp: number) {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].minXp) return LEVELS[i];
  }
  return LEVELS[0];
}
function getNextLevel(xp: number) {
  const curr = getLevel(xp);
  const idx = LEVELS.findIndex(l => l.level === curr.level);
  return LEVELS[idx + 1] || null;
}

export default function Play() {
  const { user } = useAuth();
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [totalWorkouts, setTotalWorkouts] = useState(0);
  const [totalPRs, setTotalPRs] = useState(0);
  const [earned, setEarned] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    const [{ data: profile }, { data: workouts }, { data: prs }, { data: achievements }] = await Promise.all([
      supabase.from('profiles').select('xp, streak_days').eq('id', user!.id).maybeSingle(),
      supabase.from('workouts').select('id, created_at').eq('user_id', user!.id).eq('status', 'completed').order('created_at', { ascending: false }),
      supabase.from('personal_records').select('id').eq('user_id', user!.id),
      supabase.from('user_achievements').select('achievement_id').eq('user_id', user!.id),
    ]);

    const userXp = profile?.xp || 0;
    const userStreak = profile?.streak_days || 0;
    setXp(userXp);
    setStreak(userStreak);
    setTotalWorkouts(workouts?.length || 0);
    setTotalPRs(prs?.length || 0);
    setEarned(achievements?.map((a: any) => a.achievement_id) || []);

    // Check & award achievements
    await checkAchievements(workouts?.length || 0, prs?.length || 0, userXp);
    setLoading(false);
  };

  const checkAchievements = async (wCount: number, prCount: number, currentXp: number) => {
    const { data: existing } = await supabase.from('user_achievements').select('achievement_id').eq('user_id', user!.id);
    const already = existing?.map((a: any) => a.achievement_id) || [];

    const toUnlock: string[] = [];
    if (wCount >= 1 && !already.includes('first_workout')) toUnlock.push('first_workout');
    if (wCount >= 10 && !already.includes('workouts_10')) toUnlock.push('workouts_10');
    if (wCount >= 50 && !already.includes('workouts_50')) toUnlock.push('workouts_50');
    if (wCount >= 100 && !already.includes('workouts_100')) toUnlock.push('workouts_100');
    if (prCount >= 1 && !already.includes('first_pr')) toUnlock.push('first_pr');
    if (prCount >= 5 && !already.includes('pr_5')) toUnlock.push('pr_5');

    if (toUnlock.length > 0) {
      const rows = toUnlock.map(id => ({ user_id: user!.id, achievement_id: id, earned_at: new Date().toISOString() }));
      await supabase.from('user_achievements').insert(rows);
      const addXp = toUnlock.reduce((s, id) => s + (ACHIEVEMENTS.find(a => a.id === id)?.xp || 0), 0);
      if (addXp > 0) await supabase.from('profiles').update({ xp: currentXp + addXp }).eq('id', user!.id);
    }
  };

  const level = getLevel(xp);
  const nextLevel = getNextLevel(xp);
  const xpPct = nextLevel ? Math.round(((xp - level.minXp) / (nextLevel.minXp - level.minXp)) * 100) : 100;

  if (loading) return <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ color: ACCENT, fontWeight: 900 }}>CHARGEMENT...</div></div>;

  return (
    <div style={{ minHeight: '100vh', background: BG, paddingBottom: 80 }}>
      <div style={{ padding: '24px 20px 16px', borderBottom: '1px solid ' + BORDER }}>
        <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.1em' }}>Progression</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: '-.02em' }}>PLAY</div>
      </div>

      <div style={{ padding: '20px 20px 0' }}>
        {/* Level card */}
        <div style={{ background: SURFACE, borderRadius: 16, border: '1px solid ' + level.color + '44', padding: 24, marginBottom: 16, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -20, right: -20, fontSize: 80, opacity: .05 }}>⚡</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 4 }}>Niveau {level.level}</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: level.color }}>{level.name}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 32, fontWeight: 900, color: '#fff' }}>{xp}</div>
              <div style={{ fontSize: 11, color: '#555' }}>XP TOTAL</div>
            </div>
          </div>
          {nextLevel && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: '#555' }}>Prochain : {nextLevel.name}</span>
                <span style={{ fontSize: 11, color: '#fff', fontWeight: 700 }}>{xp} / {nextLevel.minXp} XP</span>
              </div>
              <div style={{ height: 6, background: '#1a1a1a', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: xpPct + '%', background: level.color, borderRadius: 3, transition: 'width .5s' }} />
              </div>
            </>
          )}
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
          {[
            { label: 'Séances', value: totalWorkouts, icon: '🏋️' },
            { label: 'Records', value: totalPRs, icon: '🏆' },
            { label: 'Streak', value: streak + 'j', icon: '🔥' },
          ].map(({ label, value, icon }) => (
            <div key={label} style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 12, padding: '14px 10px', textAlign: 'center' }}>
              <div style={{ fontSize: 24 }}>{icon}</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginTop: 4 }}>{value}</div>
              <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Achievements */}
        <div style={{ fontSize: 13, fontWeight: 800, color: '#555', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 12 }}>
          ACHIEVEMENTS — {earned.length}/{ACHIEVEMENTS.length}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {ACHIEVEMENTS.map(a => {
            const done = earned.includes(a.id);
            return (
              <div key={a.id} style={{ background: SURFACE, border: '1px solid ' + (done ? ACCENT + '44' : BORDER), borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14, opacity: done ? 1 : 0.4 }}>
                <div style={{ fontSize: 28, filter: done ? 'none' : 'grayscale(1)' }}>{a.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: done ? '#fff' : '#555' }}>{a.title}</div>
                  <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>{a.desc}</div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 900, color: done ? ACCENT : '#333' }}>+{a.xp} XP</div>
              </div>
            );
          })}
        </div>
      </div>

      <BottomNav active="play" />
    </div>
  );
}
