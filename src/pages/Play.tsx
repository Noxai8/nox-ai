import { useEffect, useState } from 'react';
import NoxMascot from '../components/NoxMascot';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
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

  if (loading) return (
    <div style={{ minHeight: '100vh', background: BG, display: 'grid', placeItems: 'center' }}>
      <div style={{ color: ACCENT, fontWeight: 900, letterSpacing: '.14em' }}>NOX PLAY</div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#070707', color: '#fff', paddingBottom: 100 }}>
      <main style={{ width: '100%', maxWidth: 560, margin: '0 auto' }}>
        <header style={{
          padding: '24px 20px 18px',
          background: 'radial-gradient(circle at 88% 0%, rgba(200,255,0,.07), transparent 30%), #090909',
          borderBottom: '1px solid #202020'
        }}>
          <div style={{ fontSize: 10, color: '#777', textTransform: 'uppercase', letterSpacing: '.14em', fontWeight: 850 }}>Progression & récompenses</div>
          <div style={{ fontSize: 27, fontWeight: 950, letterSpacing: '-.04em', marginTop: 4 }}>PLAY</div>
        </header>

        <section style={{ padding: 20 }}>
          <div style={{
            position: 'relative', overflow: 'hidden',
            background: 'linear-gradient(145deg,#151515,#0e0e0e)',
            border: '1px solid ' + level.color + '44',
            borderRadius: 22, padding: 20, marginBottom: 12
          }}>
            <div style={{
              position: 'absolute', width: 160, height: 160, borderRadius: '50%',
              right: -70, top: -80, background: level.color, opacity: .06, filter: 'blur(8px)'
            }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 10, color: '#777', fontWeight: 850, letterSpacing: '.09em' }}>NIVEAU {level.level}</div>
                  <div style={{ fontSize: 28, fontWeight: 950, color: level.color, marginTop: 4, letterSpacing: '-.035em' }}>{level.name}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 31, fontWeight: 950, letterSpacing: '-.04em' }}>{xp}</div>
                  <div style={{ fontSize: 9.5, color: '#666', fontWeight: 850, marginTop: 2 }}>XP TOTAL</div>
                </div>
              </div>

              {nextLevel ? (
                <div style={{ marginTop: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 7 }}>
                    <span style={{ fontSize: 10.5, color: '#777' }}>Prochain niveau · {nextLevel.name}</span>
                    <span style={{ fontSize: 10.5, color: '#aaa', fontWeight: 850 }}>{xp} / {nextLevel.minXp} XP</span>
                  </div>
                  <div style={{ height: 7, borderRadius: 999, background: '#202020', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: xpPct + '%', background: level.color, borderRadius: 999, transition: 'width .5s' }} />
                  </div>
                  <div style={{ fontSize: 9.5, color: '#555', marginTop: 7 }}>
                    {Math.max(0, nextLevel.minXp - xp)} XP avant le niveau suivant
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: 18, color: ACCENT, fontSize: 11, fontWeight: 900 }}>NIVEAU MAXIMUM ATTEINT</div>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 9, marginBottom: 22 }}>
            {[
              { label: 'Séances', value: totalWorkouts },
              { label: 'Records', value: totalPRs },
              { label: 'Streak', value: streak + 'j' },
            ].map(({ label, value }) => (
              <div key={label} style={{
                background: '#111', border: '1px solid #232323', borderRadius: 16,
                padding: '15px 8px', textAlign: 'center'
              }}>
                <div style={{ fontSize: 21, fontWeight: 950 }}>{value}</div>
                <div style={{ fontSize: 9.5, color: '#666', textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 5, fontWeight: 850 }}>{label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', margin: '0 2px 10px' }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 950 }}>Achievements</div>
              <div style={{ fontSize: 10.5, color: '#666', marginTop: 3 }}>{earned.length} débloqué{earned.length > 1 ? 's' : ''} sur {ACHIEVEMENTS.length}</div>
            </div>
            <div style={{ color: ACCENT, fontSize: 11, fontWeight: 950 }}>{Math.round((earned.length / ACHIEVEMENTS.length) * 100)}%</div>
          </div>

          <div style={{ height: 5, background: '#171717', borderRadius: 999, overflow: 'hidden', marginBottom: 14 }}>
            <div style={{ height: '100%', width: `${(earned.length / ACHIEVEMENTS.length) * 100}%`, background: ACCENT, borderRadius: 999 }} />
          </div>

          <div style={{ display: 'grid', gap: 9 }}>
            {ACHIEVEMENTS.map(a => {
              const done = earned.includes(a.id);
              return (
                <div key={a.id} style={{
                  background: '#111',
                  border: '1px solid ' + (done ? 'rgba(200,255,0,.22)' : '#222'),
                  borderRadius: 16, padding: 14,
                  display: 'flex', alignItems: 'center', gap: 12,
                  opacity: done ? 1 : .46
                }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 13, flexShrink: 0,
                    background: done ? 'rgba(200,255,0,.08)' : '#171717',
                    border: '1px solid ' + (done ? 'rgba(200,255,0,.18)' : '#222'),
                    display: 'grid', placeItems: 'center',
                    fontSize: 20, filter: done ? 'none' : 'grayscale(1)'
                  }}>
                    {a.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 900, color: done ? '#fff' : '#777' }}>{a.title}</div>
                    <div style={{ fontSize: 10.5, lineHeight: 1.4, color: '#666', marginTop: 4 }}>{a.desc}</div>
                  </div>
                  <div style={{
                    flexShrink: 0, borderRadius: 9, padding: '6px 8px',
                    background: done ? 'rgba(200,255,0,.07)' : '#151515',
                    color: done ? ACCENT : '#555', fontSize: 10.5, fontWeight: 950
                  }}>
                    +{a.xp} XP
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* Mascotte */}
      <div style={{ padding: '0 20px 16px' }}>
        <NoxMascot context={totalWorkouts > 0 ? 'streak' : 'default'} compact />
      </div>

      {/* Leaderboard */}
      <div style={{ padding: '0 20px 10px' }}>
        <button onClick={() => navigate('/leaderboard')}
          style={{ width: '100%', background: '#111', border: '1px solid #1a1a1a', borderRadius: 14, padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left', touchAction: 'manipulation' }}>
          <div style={{ fontSize: 28 }}>🏆</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>CLASSEMENT GLOBAL</div>
            <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>Compare-toi à tous les athlètes NOX</div>
          </div>
          <div style={{ marginLeft: 'auto', color: '#333', fontSize: 16 }}>→</div>
        </button>
      </div>

      {/* Mode Partenaire */}
      <div style={{ padding: '16px 20px 0' }}>
        <button onClick={() => navigate('/partner')}
          style={{ width: '100%', background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 14, padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left' }}>
          <div style={{ fontSize: 28 }}>👥</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>MODE PARTENAIRE</div>
            <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>Compare ta progression avec un ami</div>
          </div>
          <div style={{ marginLeft: 'auto', color: '#333', fontSize: 16 }}>→</div>
        </button>
      </div>

      <BottomNav active="play" />
    </div>
  );
}
