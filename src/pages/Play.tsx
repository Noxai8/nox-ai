import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { BottomNav } from './Home';
import TutorialTooltip from '../components/TutorialTooltip';
import NoxMascot from '../components/NoxMascot';

const ACCENT = '#c8ff00';
const BG = '#0a0a0a';
const SURFACE = '#111';
const BORDER = '#1a1a1a';

// ── ACHIEVEMENTS ──────────────────────────────────────────────────────────────
const ACHIEVEMENTS = [
  // Training
  { id: 'first_workout', icon: '🏅', title: 'Première séance', desc: 'Séance complétée', xp: 50, cat: 'Training' },
  { id: 'workouts_5', icon: '💪', title: '5 séances', desc: '5 séances complétées', xp: 100, cat: 'Training' },
  { id: 'workouts_10', icon: '🔟', title: '10 séances', desc: '10 séances complétées', xp: 150, cat: 'Training' },
  { id: 'workouts_25', icon: '⚡', title: '25 séances', desc: '25 séances complétées', xp: 300, cat: 'Training' },
  { id: 'workouts_50', icon: '🔥', title: '50 séances', desc: 'Vrai athlète NOX', xp: 500, cat: 'Training' },
  { id: 'workouts_100', icon: '🌟', title: '100 séances', desc: 'Légende NOX', xp: 1000, cat: 'Training' },
  // PRs
  { id: 'first_pr', icon: '🏆', title: 'Premier PR', desc: 'Premier record personnel', xp: 100, cat: 'Records' },
  { id: 'pr_5', icon: '🎯', title: '5 records', desc: '5 records personnels', xp: 250, cat: 'Records' },
  { id: 'pr_10', icon: '🥇', title: '10 records', desc: '10 records personnels', xp: 400, cat: 'Records' },
  { id: 'pr_25', icon: '🏅', title: '25 records', desc: '25 records personnels', xp: 750, cat: 'Records' },
  // Streak
  { id: 'streak_3', icon: '🔥', title: '3 jours streak', desc: '3 jours consécutifs', xp: 75, cat: 'Régularité' },
  { id: 'streak_7', icon: '🗓️', title: '7 jours streak', desc: 'Une semaine parfaite', xp: 200, cat: 'Régularité' },
  { id: 'streak_14', icon: '📅', title: '14 jours streak', desc: 'Deux semaines de feu', xp: 350, cat: 'Régularité' },
  { id: 'streak_30', icon: '🏆', title: '30 jours streak', desc: 'Un mois sans failles', xp: 800, cat: 'Régularité' },
  // Body
  { id: 'first_body', icon: '📊', title: 'Premier pesée', desc: 'Premier suivi BODY', xp: 50, cat: 'Corps' },
  { id: 'body_10', icon: '📈', title: '10 pesées', desc: '10 check-ins BODY', xp: 150, cat: 'Corps' },
  // Nutrition
  { id: 'first_fuel', icon: '🥗', title: 'Premier repas', desc: 'Premier repas loggé', xp: 50, cat: 'Nutrition' },
  { id: 'fuel_7days', icon: '🍽️', title: '7 jours fuel', desc: '7 jours de tracking consécutifs', xp: 200, cat: 'Nutrition' },
  { id: 'fuel_scan', icon: '📸', title: 'Scan IA', desc: 'Premier repas scanné par IA', xp: 100, cat: 'Nutrition' },
  // Special
  { id: 'weekly_review', icon: '🔮', title: 'Weekly Review', desc: 'Premier bilan hebdomadaire', xp: 150, cat: 'Spécial' },
  { id: 'nox_future', icon: '🌌', title: 'NOX Future', desc: 'Première projection IA', xp: 150, cat: 'Spécial' },
  { id: 'comeback', icon: '⚔️', title: 'Comeback', desc: 'Retour après 10+ jours sans séance', xp: 200, cat: 'Spécial' },
];

// ── LEVELS ─────────────────────────────────────────────────────────────────────
const LEVELS = [
  { level: 1, name: 'NOVICE', minXp: 0, color: '#555' },
  { level: 2, name: 'DÉBUTANT', minXp: 200, color: '#4488ff' },
  { level: 3, name: 'ATHLÈTE', minXp: 600, color: '#44cc88' },
  { level: 4, name: 'PERFORMER', minXp: 1200, color: '#ffaa00' },
  { level: 5, name: 'ÉLITE', minXp: 2500, color: '#ff4444' },
  { level: 6, name: 'LÉGENDE NOX', minXp: 5000, color: ACCENT },
];

function getLevel(xp: number) {
  for (let i = LEVELS.length - 1; i >= 0; i--) if (xp >= LEVELS[i].minXp) return LEVELS[i];
  return LEVELS[0];
}
function getNextLevel(xp: number) {
  const curr = getLevel(xp);
  return LEVELS.find(l => l.level === curr.level + 1) || null;
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
  const [activeTab, setActiveTab] = useState<'overview' | 'badges' | 'goals' | 'missions'>('overview');
  const [dailyGoals, setDailyGoals] = useState<any[]>([]);
  const [weeklyMissions, setWeeklyMissions] = useState<any[]>([]);
  const [newUnlocked, setNewUnlocked] = useState<any[]>([]);
  const [bodyCount, setBodyCount] = useState(0);
  const [fuelDays, setFuelDays] = useState(0);

  useEffect(() => { if (user) loadData(); }, [user]);

  const loadData = async () => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const weekStart = new Date(Date.now() - 7 * 86400000).toISOString();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const [
      { data: profile },
      { data: workouts },
      { data: prs },
      { data: achievements },
      { data: bodyLogs },
      { data: foodEntries },
      { data: todayFood },
      { data: weekWorkouts },
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user!.id).maybeSingle(),
      supabase.from('workouts').select('id, created_at').eq('user_id', user!.id).eq('status', 'completed').order('created_at', { ascending: false }),
      supabase.from('personal_records').select('id').eq('user_id', user!.id),
      supabase.from('user_achievements').select('achievement_id').eq('user_id', user!.id),
      supabase.from('body_logs').select('id, created_at').eq('user_id', user!.id),
      supabase.from('food_entries').select('created_at').eq('user_id', user!.id),
      supabase.from('food_entries').select('calories, protein').eq('user_id', user!.id).gte('created_at', todayStr + 'T00:00:00').lte('created_at', todayStr + 'T23:59:59'),
      supabase.from('workouts').select('id').eq('user_id', user!.id).eq('status', 'completed').gte('created_at', weekStart),
    ]);

    const userXp = profile?.xp || 0;
    const userStreak = profile?.streak_days || 0;
    const wCount = workouts?.length || 0;
    const prCount = prs?.length || 0;
    const bCount = bodyLogs?.length || 0;

    // Jours fuel distincts
    const fuelDaysSet = new Set((foodEntries || []).map((e: any) => e.created_at?.slice(0, 10)));
    const fuelDaysCount = fuelDaysSet.size;

    setXp(userXp); setStreak(userStreak);
    setTotalWorkouts(wCount); setTotalPRs(prCount);
    setBodyCount(bCount); setFuelDays(fuelDaysCount);
    setEarned((achievements || []).map((a: any) => a.achievement_id));

    // ── Attribuer les achievements ──
    const already = (achievements || []).map((a: any) => a.achievement_id);
    const toUnlock: string[] = [];
    if (wCount >= 1) toUnlock.push('first_workout');
    if (wCount >= 5) toUnlock.push('workouts_5');
    if (wCount >= 10) toUnlock.push('workouts_10');
    if (wCount >= 25) toUnlock.push('workouts_25');
    if (wCount >= 50) toUnlock.push('workouts_50');
    if (wCount >= 100) toUnlock.push('workouts_100');
    if (prCount >= 1) toUnlock.push('first_pr');
    if (prCount >= 5) toUnlock.push('pr_5');
    if (prCount >= 10) toUnlock.push('pr_10');
    if (prCount >= 25) toUnlock.push('pr_25');
    if (userStreak >= 3) toUnlock.push('streak_3');
    if (userStreak >= 7) toUnlock.push('streak_7');
    if (userStreak >= 14) toUnlock.push('streak_14');
    if (userStreak >= 30) toUnlock.push('streak_30');
    if (bCount >= 1) toUnlock.push('first_body');
    if (bCount >= 10) toUnlock.push('body_10');
    if (fuelDaysCount >= 1) toUnlock.push('first_fuel');
    if (fuelDaysCount >= 7) toUnlock.push('fuel_7days');

    const genuineNew = toUnlock.filter(id => !already.includes(id));
    if (genuineNew.length > 0) {
      await supabase.from('user_achievements').insert(
        genuineNew.map(id => ({ user_id: user!.id, achievement_id: id, earned_at: new Date().toISOString() }))
      );
      const addXp = genuineNew.reduce((s, id) => s + (ACHIEVEMENTS.find(a => a.id === id)?.xp || 0), 0);
      if (addXp > 0) {
        await supabase.from('profiles').update({ xp: userXp + addXp }).eq('id', user!.id);
        setXp(userXp + addXp);
      }
      setEarned([...already, ...genuineNew]);
      setNewUnlocked(genuineNew.map(id => ACHIEVEMENTS.find(a => a.id === id)).filter(Boolean) as any[]);
      setTimeout(() => setNewUnlocked([]), 5000);
    }

    // ── Daily Goals ──
    const todayKcal = (todayFood || []).reduce((s: number, e: any) => s + (e.calories || 0), 0);
    const todayProtein = (todayFood || []).reduce((s: number, e: any) => s + (e.protein || 0), 0);
    const todayTargetKcal = profile?.nutrition_target_calories || 2200;
    const todayTargetProtein = profile?.nutrition_target_protein || 160;
    const todayWorkedOut = (workouts || []).some((w: any) => w.created_at?.startsWith(todayStr));

    setDailyGoals([
      { label: 'Entraînement', done: todayWorkedOut, desc: todayWorkedOut ? 'Séance complétée ✓' : 'Lance ta séance du jour', xp: 25, icon: '🏋️', action: () => navigate('/program') },
      { label: 'Calories', done: todayKcal >= todayTargetKcal * 0.8, desc: `${todayKcal} / ${todayTargetKcal} kcal`, xp: 10, icon: '🥗', action: () => navigate('/fuel') },
      { label: 'Protéines', done: todayProtein >= todayTargetProtein * 0.9, desc: `${Math.round(todayProtein)}g / ${todayTargetProtein}g`, xp: 10, icon: '💪', action: () => navigate('/fuel') },
      { label: 'Streak maintenu', done: userStreak > 0, desc: userStreak > 0 ? `${userStreak} jours 🔥` : 'Fais quelque chose aujourd\'hui', xp: 5, icon: '🔥', action: () => {} },
    ]);

    // ── Weekly Missions ──
    const weekWCount = weekWorkouts?.length || 0;
    const weekTarget = profile?.available_days?.length || 3;
    setWeeklyMissions([
      { label: `${weekTarget} séances cette semaine`, done: weekWCount >= weekTarget, progress: weekWCount, total: weekTarget, xp: 100, icon: '🎯' },
      { label: 'Logger 5 jours de nutrition', done: fuelDaysCount >= 5, progress: Math.min(fuelDaysCount, 5), total: 5, xp: 75, icon: '📊' },
      { label: 'Battre un PR', done: (prs || []).some((p: any) => new Date(p.created_at) >= new Date(weekStart)), progress: 0, total: 1, xp: 150, icon: '🏆' },
      { label: 'Faire un check-in BODY', done: (bodyLogs || []).some((b: any) => new Date(b.created_at) >= new Date(weekStart)), progress: 0, total: 1, xp: 50, icon: '⚖️' },
    ]);

    setLoading(false);
  };

  const level = getLevel(xp);
  const nextLevel = getNextLevel(xp);
  const xpPct = nextLevel ? Math.round(((xp - level.minXp) / (nextLevel.minXp - level.minXp)) * 100) : 100;
  const cats = [...new Set(ACHIEVEMENTS.map(a => a.cat))];

  if (loading) return (
    <div style={{ minHeight: '100vh', background: BG, display: 'grid', placeItems: 'center' }}>
      <div style={{ color: ACCENT, fontWeight: 900, letterSpacing: '.14em' }}>NOX PLAY</div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: BG, paddingBottom: 90 }}>
      {/* Nouveau badge notif */}
      {newUnlocked.length > 0 && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 500, background: ACCENT, borderRadius: 14, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 8px 30px rgba(200,255,0,.4)' }}>
          <span style={{ fontSize: 24 }}>{newUnlocked[0]?.icon}</span>
          <div>
            <div style={{ fontSize: 11, fontWeight: 900, color: '#000' }}>NOUVEAU BADGE 🎉</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#000' }}>{newUnlocked[0]?.title} · +{newUnlocked[0]?.xp} XP</div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ padding: '20px 20px 0', borderBottom: '1px solid ' + BORDER }}>
        <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.1em' }}>Progression</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 16 }}>PLAY</div>

        {/* Level card */}
        <div style={{ background: `linear-gradient(135deg, ${level.color}18, ${SURFACE})`, border: '1px solid ' + level.color + '44', borderRadius: 18, padding: 18, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 10, color: '#555', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em' }}>NIVEAU {level.level}</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: level.color }}>{level.name}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#fff' }}>{xp.toLocaleString()}</div>
              <div style={{ fontSize: 10, color: '#555' }}>XP TOTAL</div>
            </div>
          </div>
          {nextLevel && (
            <>
              <div style={{ height: 6, background: '#1a1a1a', borderRadius: 3, overflow: 'hidden', marginBottom: 6 }}>
                <div style={{ height: '100%', width: xpPct + '%', background: level.color, borderRadius: 3, transition: 'width .4s' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 10, color: '#555' }}>{xpPct}% vers {nextLevel.name}</div>
                <div style={{ fontSize: 10, color: '#555' }}>{nextLevel.minXp - xp} XP restants</div>
              </div>
            </>
          )}
        </div>

        {/* Stats rapides */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0, marginBottom: 0 }}>
          {[
            { label: 'Streak', value: streak, unit: 'j', color: streak > 0 ? '#ff6600' : '#555' },
            { label: 'Séances', value: totalWorkouts, unit: '', color: '#fff' },
            { label: 'PRs', value: totalPRs, unit: '', color: '#fff' },
            { label: 'Badges', value: earned.length, unit: '', color: ACCENT },
          ].map(({ label, value, unit, color }) => (
            <div key={label} style={{ padding: '10px 0', textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 900, color }}>{value}<span style={{ fontSize: 10, color: '#555' }}>{unit}</span></div>
              <div style={{ fontSize: 9, color: '#555', fontWeight: 700, textTransform: 'uppercase' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderTop: '1px solid ' + BORDER }}>
          {[
            ['overview', 'Vue d\'ens.'],
            ['goals', 'Objectifs'],
            ['missions', 'Missions'],
            ['badges', 'Badges'],
          ].map(([id, label]) => (
            <button key={id} onClick={() => setActiveTab(id as any)}
              style={{ flex: 1, padding: '10px 0', background: 'none', border: 'none', borderBottom: '2px solid ' + (activeTab === id ? ACCENT : 'transparent'), color: activeTab === id ? ACCENT : '#555', fontSize: 11, fontWeight: 700, cursor: 'pointer', touchAction: 'manipulation' }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '16px 20px 0' }}>

        {/* ── OVERVIEW ── */}
        {activeTab === 'overview' && (
          <div>
            <NoxMascot context={streak > 3 ? 'streak' : totalPRs > 0 ? 'pr' : 'default'} compact />
            <div style={{ height: 16 }} />

            {/* Daily goals résumé */}
            <div style={{ fontSize: 11, color: '#555', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }}>OBJECTIFS DU JOUR</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
              {dailyGoals.map(g => (
                <button key={g.label} onClick={g.action}
                  style={{ background: g.done ? ACCENT + '11' : SURFACE, border: '1px solid ' + (g.done ? ACCENT + '44' : BORDER), borderRadius: 14, padding: '12px 14px', textAlign: 'left', cursor: 'pointer', touchAction: 'manipulation' }}>
                  <div style={{ fontSize: 20, marginBottom: 6 }}>{g.icon}</div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: g.done ? ACCENT : '#fff' }}>{g.label}</div>
                  <div style={{ fontSize: 10, color: '#555', marginTop: 2 }}>{g.desc}</div>
                  {g.done && <div style={{ fontSize: 10, color: ACCENT, marginTop: 4, fontWeight: 700 }}>+{g.xp} XP ✓</div>}
                </button>
              ))}
            </div>

            {/* Missions semaine résumé */}
            <div style={{ fontSize: 11, color: '#555', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }}>MISSIONS DE LA SEMAINE</div>
            {weeklyMissions.map(m => (
              <div key={m.label} style={{ background: SURFACE, border: '1px solid ' + (m.done ? ACCENT + '33' : BORDER), borderRadius: 12, padding: '10px 14px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 20 }}>{m.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: m.done ? ACCENT : '#fff' }}>{m.label}</div>
                  {m.total > 1 && (
                    <div style={{ height: 3, background: '#1a1a1a', borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: (m.progress / m.total * 100) + '%', background: ACCENT, borderRadius: 2 }} />
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 12, color: m.done ? ACCENT : '#555', fontWeight: 700 }}>+{m.xp} XP</div>
              </div>
            ))}

            {/* Classement CTA */}
            <div style={{ marginTop: 16 }}>
              <button onClick={() => navigate('/leaderboard')}
                style={{ width: '100%', background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 14, padding: '14px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left', touchAction: 'manipulation' }}>
                <div style={{ fontSize: 24 }}>🏆</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>Classement global</div>
                  <div style={{ fontSize: 11, color: '#555' }}>Compare-toi aux autres athlètes NOX</div>
                </div>
                <div style={{ marginLeft: 'auto', color: '#333' }}>→</div>
              </button>
            </div>
          </div>
        )}

        {/* ── DAILY GOALS ── */}
        {activeTab === 'goals' && (
          <div>
            <div style={{ fontSize: 11, color: '#555', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>OBJECTIFS DU JOUR</div>
            <div style={{ fontSize: 12, color: '#555', marginBottom: 16 }}>
              {dailyGoals.filter(g => g.done).length}/{dailyGoals.length} complétés · {dailyGoals.filter(g => g.done).reduce((s, g) => s + g.xp, 0)} XP gagnés
            </div>
            {dailyGoals.map(g => (
              <button key={g.label} onClick={g.action}
                style={{ width: '100%', background: g.done ? ACCENT + '0d' : SURFACE, border: '1px solid ' + (g.done ? ACCENT + '33' : BORDER), borderRadius: 14, padding: '16px 18px', cursor: 'pointer', textAlign: 'left', marginBottom: 10, touchAction: 'manipulation', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: g.done ? ACCENT + '22' : '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                  {g.done ? '✅' : g.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: g.done ? ACCENT : '#fff' }}>{g.label}</div>
                  <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>{g.desc}</div>
                </div>
                <div style={{ fontSize: 13, color: g.done ? ACCENT : '#333', fontWeight: 800, flexShrink: 0 }}>+{g.xp} XP</div>
              </button>
            ))}
          </div>
        )}

        {/* ── WEEKLY MISSIONS ── */}
        {activeTab === 'missions' && (
          <div>
            <div style={{ fontSize: 11, color: '#555', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>MISSIONS DE LA SEMAINE</div>
            <div style={{ fontSize: 12, color: '#555', marginBottom: 16 }}>
              {weeklyMissions.filter(m => m.done).length}/{weeklyMissions.length} complétées
            </div>
            {weeklyMissions.map(m => (
              <div key={m.label} style={{ background: m.done ? ACCENT + '0d' : SURFACE, border: '1px solid ' + (m.done ? ACCENT + '33' : BORDER), borderRadius: 16, padding: '16px 18px', marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: m.total > 1 ? 10 : 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 24 }}>{m.done ? '✅' : m.icon}</span>
                    <div style={{ fontSize: 14, fontWeight: 800, color: m.done ? ACCENT : '#fff' }}>{m.label}</div>
                  </div>
                  <div style={{ fontSize: 13, color: m.done ? ACCENT : '#555', fontWeight: 800 }}>+{m.xp} XP</div>
                </div>
                {m.total > 1 && (
                  <>
                    <div style={{ height: 6, background: '#1a1a1a', borderRadius: 3, overflow: 'hidden', marginBottom: 4 }}>
                      <div style={{ height: '100%', width: Math.min(100, m.progress / m.total * 100) + '%', background: m.done ? ACCENT : ACCENT + '66', borderRadius: 3 }} />
                    </div>
                    <div style={{ fontSize: 11, color: '#555' }}>{m.progress} / {m.total}</div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── BADGES ── */}
        {activeTab === 'badges' && (
          <div>
            <div style={{ fontSize: 12, color: '#555', marginBottom: 16 }}>
              {earned.length} / {ACHIEVEMENTS.length} badges débloqués
            </div>
            {cats.map(cat => (
              <div key={cat} style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 11, color: '#555', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }}>{cat}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                  {ACHIEVEMENTS.filter(a => a.cat === cat).map(a => {
                    const isEarned = earned.includes(a.id);
                    return (
                      <div key={a.id} style={{ background: isEarned ? ACCENT + '0d' : SURFACE, border: '1px solid ' + (isEarned ? ACCENT + '33' : BORDER), borderRadius: 14, padding: '14px 14px', opacity: isEarned ? 1 : 0.4 }}>
                        <div style={{ fontSize: 28, marginBottom: 6 }}>{a.icon}</div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: isEarned ? ACCENT : '#fff' }}>{a.title}</div>
                        <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>{a.desc}</div>
                        <div style={{ fontSize: 10, color: isEarned ? ACCENT : '#333', marginTop: 6, fontWeight: 700 }}>+{a.xp} XP</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <TutorialTooltip page="play" />
      <BottomNav active="play" />
    </div>
  );
}
