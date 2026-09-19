import { useEffect, useState } from 'react';
import NoxMascot from '../components/NoxMascot';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { BottomNav } from '../components/BottomNav';

const ACCENT = '#B7FF00';
const BG = '#F7F7F7';
const SURFACE = '#FFFFFF';
const BORDER = '#EAEAEA';

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
  const [dailyScore, setDailyScore] = useState(0);
  const [dailyGoals, setDailyGoals] = useState({ nutrition: false, activity: false, workout: false });
  const [comebackMode, setComebackMode] = useState(false);
  const [weeklyProgress, setWeeklyProgress] = useState({ movement: 0, nutritionDays: 0 });
  const [missionClaimed, setMissionClaimed] = useState(false);
  const [personalChallenge, setPersonalChallenge] = useState({ target: 5, progress: 0 });

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    const weekStart = new Date(Date.now()-7*86400000);
    const [{ data: profile }, { data: workouts }, { data: prs }, { data: achievements }, { data: body }, { data: food }, { data: activity }] = await Promise.all([
      supabase.from('profiles').select('xp, streak_days').eq('id', user!.id).maybeSingle(),
      supabase.from('workouts').select('id, created_at').eq('user_id', user!.id).eq('status', 'completed').order('created_at', { ascending: false }),
      supabase.from('personal_records').select('id').eq('user_id', user!.id),
      supabase.from('user_achievements').select('achievement_id').eq('user_id', user!.id),
      supabase.from('body_logs').select('id').eq('user_id', user!.id).limit(1),
      supabase.from('food_entries').select('id, created_at').eq('user_id', user!.id).gte('created_at', weekStart.toISOString()),
      supabase.from('activity_logs').select('id, performed_at, duration_minutes').eq('user_id', user!.id).gte('performed_at', weekStart.toISOString()),
    ]);

    const userXp = profile?.xp || 0;
    const userStreak = profile?.streak_days || 0;
    setXp(userXp);
    setStreak(userStreak);
    setTotalWorkouts(workouts?.length || 0);
    setTotalPRs(prs?.length || 0);
    setEarned(achievements?.map((a: any) => a.achievement_id) || []);

    // Check & award achievements
    const todayFood=(food||[]).some((x:any)=>new Date(x.created_at)>=todayStart);
    const todayActivity=(activity||[]).some((x:any)=>new Date(x.performed_at)>=todayStart);
    const todayWorkout=(workouts||[]).some((x:any)=>new Date(x.created_at)>=todayStart);
    const goals={nutrition:todayFood,activity:todayActivity,workout:todayWorkout};
    setDailyGoals(goals);
    setDailyScore(Math.round(([goals.nutrition,goals.activity,goals.workout].filter(Boolean).length/3)*100));
    const latestWorkout=workouts?.[0]?.created_at ? new Date(workouts[0].created_at).getTime() : 0;
    setComebackMode(Boolean(latestWorkout && Date.now()-latestWorkout>7*86400000));
    const movementDays=new Set([...(workouts||[]).map((x:any)=>new Date(x.created_at).toISOString().slice(0,10)),...(activity||[]).map((x:any)=>new Date(x.performed_at).toISOString().slice(0,10))]).size;
    const nutritionDays=new Set((food||[]).map((x:any)=>new Date(x.created_at).toISOString().slice(0,10))).size;
    setWeeklyProgress({movement:movementDays,nutritionDays});
    const weekKey=new Date().toISOString().slice(0,10)+'_'+new Date().getDay();
    setMissionClaimed(localStorage.getItem('nox_mission_claimed_'+user!.id+'_'+weekKey)==='1');
    const savedChallenge=Number(localStorage.getItem('nox_personal_challenge_'+user!.id)||5);
    setPersonalChallenge({target:savedChallenge,progress:movementDays});
    await checkAchievements(workouts?.length || 0, prs?.length || 0, userXp, userStreak, (body?.length||0)>0, (food?.length||0)>0);
    setLoading(false);
  };

  const checkAchievements = async (wCount: number, prCount: number, currentXp: number, streakDays: number, hasBody: boolean, hasFood: boolean) => {
    const { data: existing } = await supabase.from('user_achievements').select('achievement_id').eq('user_id', user!.id);
    const already = existing?.map((a: any) => a.achievement_id) || [];

    const toUnlock: string[] = [];
    if (wCount >= 1 && !already.includes('first_workout')) toUnlock.push('first_workout');
    if (wCount >= 10 && !already.includes('workouts_10')) toUnlock.push('workouts_10');
    if (wCount >= 50 && !already.includes('workouts_50')) toUnlock.push('workouts_50');
    if (wCount >= 100 && !already.includes('workouts_100')) toUnlock.push('workouts_100');
    if (prCount >= 1 && !already.includes('first_pr')) toUnlock.push('first_pr');
    if (prCount >= 5 && !already.includes('pr_5')) toUnlock.push('pr_5');
    if (streakDays >= 7 && !already.includes('week_streak')) toUnlock.push('week_streak');
    if (streakDays >= 30 && !already.includes('month_streak')) toUnlock.push('month_streak');
    if (hasBody && !already.includes('body_checkin')) toUnlock.push('body_checkin');
    if (hasFood && !already.includes('fuel_day')) toUnlock.push('fuel_day');

    if (toUnlock.length > 0) {
      const rows = toUnlock.map(id => ({ user_id: user!.id, achievement_id: id, earned_at: new Date().toISOString() }));
      await supabase.from('user_achievements').insert(rows);
      const addXp = toUnlock.reduce((s, id) => s + (ACHIEVEMENTS.find(a => a.id === id)?.xp || 0), 0);
      if (addXp > 0) { const nextXp=currentXp+addXp; await supabase.from('profiles').update({ xp: nextXp }).eq('id', user!.id); setXp(nextXp); }
      setEarned([...already,...toUnlock]);
    }
  };

  const missionComplete=weeklyProgress.movement>=3&&weeklyProgress.nutritionDays>=3;
  const claimMission=async()=>{
    if(!user||!missionComplete||missionClaimed)return;
    const weekKey=new Date().toISOString().slice(0,10)+'_'+new Date().getDay();
    const nextXp=xp+150;
    const {error}=await supabase.from('profiles').update({xp:nextXp}).eq('id',user.id);
    if(error)return;
    localStorage.setItem('nox_mission_claimed_'+user.id+'_'+weekKey,'1');
    setXp(nextXp);setMissionClaimed(true);
  };
  const setChallengeTarget=(target:number)=>{if(!user)return;localStorage.setItem('nox_personal_challenge_'+user.id,String(target));setPersonalChallenge({target,progress:weeklyProgress.movement})};

  const level = getLevel(xp);
  const nextLevel = getNextLevel(xp);
  const xpPct = nextLevel ? Math.round(((xp - level.minXp) / (nextLevel.minXp - level.minXp)) * 100) : 100;

  if (loading) return (
    <div style={{ minHeight: '100vh', background: BG, display: 'grid', placeItems: 'center' }}>
      <div style={{ color: ACCENT, fontWeight: 900, letterSpacing: '.14em' }}>NOX PLAY</div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: BG, color: '#0A0A0A', paddingBottom: 100 }}>
      <main style={{ width: '100%', maxWidth: 560, margin: '0 auto' }}>
        <header style={{
          padding: '24px 20px 18px',
          background: 'radial-gradient(circle at 88% 0%, rgba(183,255,0,.12), transparent 30%), #FFFFFF',
          borderBottom: '1px solid #EAEAEA'
        }}>
          <div style={{ fontSize: 10, color: '#777', textTransform: 'uppercase', letterSpacing: '.14em', fontWeight: 850 }}>Progression & récompenses</div>
          <div style={{ fontSize: 27, fontWeight: 950, letterSpacing: '-.04em', marginTop: 4 }}>PROGRESSION</div>
        </header>

        <section style={{ padding: 20 }}>
          <div style={{
            position: 'relative', overflow: 'hidden',
            background: '#0A0A0A',
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


          <div style={{background:'#fff',border:'1px solid '+BORDER,borderRadius:18,padding:16,marginBottom:12}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><div><div style={{fontSize:10,color:'#777',fontWeight:900,letterSpacing:'.08em'}}>DAILY GOALS</div><div style={{fontSize:16,fontWeight:950,marginTop:3}}>Aujourd’hui</div></div><div style={{fontSize:22,fontWeight:950}}>{dailyScore}<span style={{fontSize:10,color:'#777'}}>/100</span></div></div>
            <div style={{height:7,background:'#ECECEC',borderRadius:99,overflow:'hidden',marginTop:12}}><div style={{height:'100%',width:dailyScore+'%',background:ACCENT}}/></div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:7,marginTop:10}}>{[['Nutrition',dailyGoals.nutrition],['Activité',dailyGoals.activity],['Séance',dailyGoals.workout]].map(([label,done]:any)=><div key={label} style={{padding:'9px 6px',borderRadius:11,background:done?'rgba(183,255,0,.16)':'#F5F5F5',fontSize:10,fontWeight:850,textAlign:'center'}}>{done?'✓ ':''}{label}</div>)}</div>
            <div style={{fontSize:9.5,color:'#777',lineHeight:1.4,marginTop:9}}>Le Daily Score reflète ta régularité personnelle dans NOX. Ce n’est pas un score de santé.</div>
          </div>

          {comebackMode&&<div style={{background:'#0A0A0A',color:'#fff',borderRadius:18,padding:16,marginBottom:12}}><div style={{fontSize:10,color:ACCENT,fontWeight:950,letterSpacing:'.09em'}}>COMEBACK MODE</div><div style={{fontSize:17,fontWeight:950,marginTop:4}}>Reprends sans repartir de zéro.</div><div style={{fontSize:11,color:'#AAA',lineHeight:1.45,marginTop:6}}>Après une pause, NOX remet l’accent sur une prochaine action simple plutôt que sur la perte de streak.</div><button onClick={()=>navigate('/activity')} style={{marginTop:11,border:0,borderRadius:10,background:ACCENT,color:'#000',padding:'10px 12px',fontWeight:950,fontSize:10}}>REPRENDRE</button></div>}

          <div style={{background:'#fff',border:'1px solid '+BORDER,borderRadius:18,padding:16,marginBottom:12}}>
            <div style={{display:'flex',justifyContent:'space-between',gap:12}}><div><div style={{fontSize:10,color:'#777',fontWeight:900,letterSpacing:'.08em'}}>MISSION HEBDO</div><div style={{fontSize:15,fontWeight:950,marginTop:4}}>Construis ta régularité</div></div><strong style={{fontSize:11}}>+150 XP</strong></div>
            <div style={{fontSize:11,color:'#666',marginTop:7}}>3 jours avec séance/activité + 3 jours de suivi nutritionnel.</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:7,marginTop:10}}><div style={{background:'#F5F5F5',borderRadius:11,padding:10,fontSize:10,fontWeight:850}}>Mouvement · {Math.min(weeklyProgress.movement,3)}/3</div><div style={{background:'#F5F5F5',borderRadius:11,padding:10,fontSize:10,fontWeight:850}}>Nutrition · {Math.min(weeklyProgress.nutritionDays,3)}/3</div></div>
            <button onClick={()=>void claimMission()} disabled={!missionComplete||missionClaimed} style={{width:'100%',marginTop:10,border:0,borderRadius:10,padding:11,background:missionComplete&&!missionClaimed?ACCENT:'#ECECEC',color:'#0A0A0A',fontSize:10,fontWeight:950,cursor:missionComplete&&!missionClaimed?'pointer':'default'}}>{missionClaimed?'RÉCOMPENSE RÉCUPÉRÉE':missionComplete?'RÉCUPÉRER +150 XP':'MISSION EN COURS'}</button>
          </div>
          <div style={{background:'#fff',border:'1px solid '+BORDER,borderRadius:18,padding:16,marginBottom:18}}>
            <div style={{fontSize:10,color:'#777',fontWeight:900,letterSpacing:'.08em'}}>CHALLENGE PERSONNEL</div><div style={{fontSize:15,fontWeight:950,marginTop:4}}>{personalChallenge.progress} / {personalChallenge.target} jours actifs</div>
            <div style={{height:7,background:'#ECECEC',borderRadius:99,overflow:'hidden',marginTop:10}}><div style={{height:'100%',width:Math.min(100,(personalChallenge.progress/personalChallenge.target)*100)+'%',background:ACCENT}}/></div>
            <div style={{display:'flex',gap:7,marginTop:10}}>{[3,5,7].map(n=><button key={n} onClick={()=>setChallengeTarget(n)} style={{flex:1,border:'1px solid '+(personalChallenge.target===n?ACCENT:BORDER),borderRadius:9,background:personalChallenge.target===n?ACCENT:'#fff',padding:8,fontSize:10,fontWeight:900}}>{n} JOURS</button>)}</div>
            <button onClick={()=>navigate('/partner')} style={{width:'100%',marginTop:9,border:'1px solid '+BORDER,borderRadius:10,background:'#fff',padding:10,fontSize:10,fontWeight:900}}>DÉFIER UN AMI →</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 9, marginBottom: 22 }}>
            {[
              { label: 'Séances', value: totalWorkouts },
              { label: 'Records', value: totalPRs },
              { label: 'Streak', value: streak + 'j' },
            ].map(({ label, value }) => (
              <div key={label} style={{
                background: '#fff', border: '1px solid #EAEAEA', borderRadius: 16,
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
                  background: '#fff',
                  border: '1px solid ' + (done ? 'rgba(183,255,0,.55)' : '#EAEAEA'),
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
                    <div style={{ fontSize: 13.5, fontWeight: 900, color: done ? '#0A0A0A' : '#777' }}>{a.title}</div>
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
          style={{ width: '100%', background: '#fff', border: '1px solid #EAEAEA', borderRadius: 14, padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left', touchAction: 'manipulation' }}>
          <div style={{ fontSize: 28 }}>🏆</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#0A0A0A' }}>CLASSEMENT OPTIONNEL</div>
            <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>Classement optionnel entre membres NOX</div>
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
            <div style={{ fontSize: 14, fontWeight: 800, color: '#0A0A0A' }}>MODE PARTENAIRE</div>
            <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>Partage uniquement les éléments que tu choisis</div>
          </div>
          <div style={{ marginLeft: 'auto', color: '#333', fontSize: 16 }}>→</div>
        </button>
      </div>

      <BottomNav active="play" />
    </div>
  );
}
