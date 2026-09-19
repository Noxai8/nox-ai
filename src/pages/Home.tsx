import { calculateNoxScore } from '../lib/noxBrain';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '../components/BottomNav';
import {
  Activity,
  Apple,
  ArrowRight,
  BarChart3,
  Droplets,
  ChevronRight,
  Dumbbell,
  Flame,
  MoonStar,
  Play,
  ScanLine,
  Sparkles,
  Trophy,
  UserRound,
  WandSparkles,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';

const ACCENT = '#B7FF00';
const BG = '#F7F7F7';
const SURFACE = '#FFFFFF';
const SURFACE_2 = '#F3F3F3';
const BORDER = '#E9E9E9';
const MUTED = '#777777';
const TEXT = '#0A0A0A';

const cardStyle: React.CSSProperties = {
  background: '#FFFFFF',
  border: `1px solid ${BORDER}`,
  borderRadius: 22,
  boxShadow: '0 10px 30px rgba(0,0,0,.05)',
};

function NoxScore({ score }: { score: number }) {
  const safe = Math.max(0, Math.min(100, score));
  const degrees = safe * 3.6;

  return (
    <div
      style={{
        width: 82,
        height: 82,
        borderRadius: '50%',
        padding: 5,
        background: `conic-gradient(${ACCENT} 0deg ${degrees}deg, #EAEAEA ${degrees}deg 360deg)`,
        boxShadow: '0 0 28px rgba(200,255,0,.08)',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          background: '#FFFFFF',
          display: 'grid',
          placeItems: 'center',
          textAlign: 'center',
        }}
      >
        <div>
          <div style={{ fontSize: 24, lineHeight: 1, fontWeight: 950, color: TEXT }}>{safe}</div>
          <div
            style={{
              marginTop: 5,
              color: '#777',
              fontSize: 8.5,
              fontWeight: 850,
              textTransform: 'uppercase',
              letterSpacing: '.1em',
            }}
          >
            NOX Score
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  eyebrow,
  value,
  detail,
  onClick,
}: {
  icon: React.ElementType;
  eyebrow: string;
  value: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        ...cardStyle,
        minHeight: 132,
        padding: 16,
        textAlign: 'left',
        cursor: 'pointer',
        color: TEXT,
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          display: 'grid',
          placeItems: 'center',
          borderRadius: 11,
          background: 'rgba(183,255,0,.18)',
          color: '#4D6800',
          marginBottom: 18,
        }}
      >
        <Icon size={17} strokeWidth={2.2} />
      </div>

      <div
        style={{
          fontSize: 10,
          color: '#777',
          textTransform: 'uppercase',
          letterSpacing: '.08em',
          fontWeight: 800,
        }}
      >
        {eyebrow}
      </div>
      <div style={{ fontSize: 22, color: TEXT, fontWeight: 950, marginTop: 3, letterSpacing: '-.03em' }}>{value}</div>
      <div style={{ fontSize: 11.5, color: MUTED, marginTop: 5 }}>{detail}</div>
    </button>
  );
}

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<any>(null);
  const [program, setProgram] = useState<any>(null);
  const [todaySession, setTodaySession] = useState<any>(null);
  const [todaySessionIdx, setTodaySessionIdx] = useState<number>(0);
  const [workoutCount, setWorkoutCount] = useState(0);
  const [prCount, setPrCount] = useState(0);
  const [weekWorkouts, setWeekWorkouts] = useState(0);
  const [todayKcal, setTodayKcal] = useState(0);
  const [todayProtein, setTodayProtein] = useState(0);
  const [todayCarbs, setTodayCarbs] = useState(0);
  const [todayFat, setTodayFat] = useState(0);
  const [targetProtein, setTargetProtein] = useState<number | null>(null);
  const [todayActivityMinutes, setTodayActivityMinutes] = useState(0);
  const [dayPeriod, setDayPeriod] = useState<'morning'|'day'|'evening'>(() => { const h=new Date().getHours(); return h<12?'morning':h<18?'day':'evening'; });
  const [todayFoodCount, setTodayFoodCount] = useState(0);
  const [todayMealTypes, setTodayMealTypes] = useState<string[]>([]);
  const [todayMeals, setTodayMeals] = useState<any[]>([]);
  const [todayWaterMl, setTodayWaterMl] = useState(0);
  const [waterGoal, setWaterGoal] = useState(2500);
  const [waterSaving, setWaterSaving] = useState(false);
  const [todaySteps, setTodaySteps] = useState(0);
  const [stepGoal, setStepGoal] = useState(10000);
  const [todayDistanceKm, setTodayDistanceKm] = useState(0);
  const [todayActiveCalories, setTodayActiveCalories] = useState(0);
  const [todayWorkouts, setTodayWorkouts] = useState(0);
  const [targetKcal, setTargetKcal] = useState<number | null>(null);
  const [latestWeight, setLatestWeight] = useState<number | null>(null);
  const [goalWeight, setGoalWeight] = useState<number | null>(null);
  const [latestSleepHours, setLatestSleepHours] = useState<number | null>(null);
  const [xp, setXp] = useState(0);
  const [loading, setLoading] = useState(true);

  const days = ['DIM', 'LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM'];
  const todayDay = days[new Date().getDay()];
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const tomorrowDate = new Date(now); tomorrowDate.setDate(tomorrowDate.getDate()+1);
  const tomorrow = `${tomorrowDate.getFullYear()}-${String(tomorrowDate.getMonth()+1).padStart(2,'0')}-${String(tomorrowDate.getDate()).padStart(2,'0')}`;
  const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  useEffect(() => {
    const updatePeriod = () => {
      const h = new Date().getHours();
      setDayPeriod(h < 12 ? 'morning' : h < 18 ? 'day' : 'evening');
    };
    updatePeriod();
    const timer = window.setInterval(updatePeriod, 60_000);
    return () => window.clearInterval(timer);
  }, []);

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
        { data: todayActivity },
        { data: nutritionTarget },
        { data: recoveryLogs },
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
        supabase.from('workout_programs').select('*').eq('user_id', user.id).eq('is_active', true).maybeSingle(),
        supabase.from('workouts').select('id').eq('user_id', user.id).eq('status', 'completed'),
        supabase.from('personal_records').select('id').eq('user_id', user.id),
        supabase
          .from('workouts')
          .select('id, created_at')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .gte('created_at', weekStart),
        supabase
          .from('food_entries')
          .select('id, meal_type, food_name, calories, protein, carbs, fat, created_at')
          .eq('user_id', user.id)
          .gte('created_at', today + 'T00:00:00').lt('created_at', tomorrow + 'T00:00:00'),
        supabase
          .from('body_logs')
          .select('weight')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1),
        supabase.from('activity_logs').select('duration_minutes, distance_km, calories_burned, steps').eq('user_id', user.id).gte('performed_at', today + 'T00:00:00').lt('performed_at', tomorrow + 'T00:00:00'),
        supabase.from('nutrition_targets').select('calories, protein').eq('user_id', user.id).maybeSingle(),
        supabase.from('recovery_logs').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1),
      ]);

      setProfile(prof);
      setProgram(prog);
      setWorkoutCount(logs?.length || 0);
      setPrCount(prs?.length || 0);
      setWeekWorkouts(weekLogs?.length || 0);
      setTodayWorkouts((weekLogs || []).filter((item: any) => new Date(item.created_at).toDateString() === new Date().toDateString()).length);
      setTodayKcal(fuel?.reduce((sum: number, item: any) => sum + (item.calories || 0), 0) || 0);
      setTodayProtein(fuel?.reduce((sum: number, item: any) => sum + Number(item.protein || 0), 0) || 0);
      setTodayCarbs(fuel?.reduce((sum: number, item: any) => sum + Number(item.carbs || 0), 0) || 0);
      setTodayFat(fuel?.reduce((sum: number, item: any) => sum + Number(item.fat || 0), 0) || 0);
      setTodayFoodCount(fuel?.length || 0);
      setTodayMeals(fuel || []);
      setTodayMealTypes(Array.from(new Set((fuel || []).map((item: any) => String(item.meal_type || '')).filter(Boolean))));
      const storedWater = Number(localStorage.getItem('nox_water_' + user.id + '_' + today) || 0);
      const storedWaterGoal = Number(localStorage.getItem('nox_water_goal_' + user.id) || 2500);
      setTodayWaterMl(Number.isFinite(storedWater) ? storedWater : 0);
      setWaterGoal(Number.isFinite(storedWaterGoal) && storedWaterGoal > 0 ? storedWaterGoal : 2500);
      setTodayActivityMinutes(todayActivity?.reduce((sum: number, item: any) => sum + Number(item.duration_minutes || 0), 0) || 0);
      setTodaySteps(todayActivity?.reduce((sum: number, item: any) => sum + Number(item.steps || 0), 0) || 0);
      const profileStepGoal = Number(prof?.step_goal ?? prof?.daily_steps_goal ?? prof?.steps_goal ?? 10000);
      setStepGoal(Number.isFinite(profileStepGoal) && profileStepGoal > 0 ? profileStepGoal : 10000);
      setTodayDistanceKm(todayActivity?.reduce((sum: number, item: any) => sum + Number(item.distance_km || 0), 0) || 0);
      setTodayActiveCalories(todayActivity?.reduce((sum: number, item: any) => sum + Number(item.calories_burned || 0), 0) || 0);
      const centralizedTarget = Number(nutritionTarget?.calories || 0);
      const profileTarget = Number(prof?.daily_calories || prof?.calorie_target || 0);
      setTargetKcal(centralizedTarget > 0 ? centralizedTarget : profileTarget > 0 ? profileTarget : null);
      const centralizedProtein = Number(nutritionTarget?.protein || 0);
      const profileProtein = Number(prof?.protein_target || 0);
      setTargetProtein(centralizedProtein > 0 ? centralizedProtein : profileProtein > 0 ? profileProtein : null);
      setLatestWeight(bodyLogs?.[0]?.weight || null);
      const profileGoalWeight = Number(prof?.goal_weight_kg ?? prof?.goal_weight ?? prof?.target_weight ?? 0);
      setGoalWeight(Number.isFinite(profileGoalWeight) && profileGoalWeight > 0 ? profileGoalWeight : null);
      const recovery = recoveryLogs?.[0];
      const sleepHours = Number(recovery?.sleep_hours ?? recovery?.sleep_duration_hours ?? recovery?.sleep_duration ?? 0);
      setLatestSleepHours(Number.isFinite(sleepHours) && sleepHours > 0 ? sleepHours : null);
      setXp(prof?.xp || 0);

      if (prog?.program_json) {
        const sessions = prog.program_json.sessions || [];
        const foundIdx = sessions.findIndex(
          (session: any) =>
            session.day === todayDay || (session.days && session.days.includes(todayDay)),
        );
        setTodaySessionIdx(foundIdx >= 0 ? foundIdx : 0);
        setTodaySession(foundIdx >= 0 ? sessions[foundIdx] : null);
      }

      setLoading(false);
    };

    load();
  }, [user]);

  const isRestDay = !todaySession;

  const greet = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'BONJOUR';
    if (hour < 18) return 'BONNE APRÈS-MIDI';
    return 'BONSOIR';
  };

  const addWater = (ml: number) => {
    if (!user || waterSaving) return;
    setWaterSaving(true);
    const next = todayWaterMl + ml;
    setTodayWaterMl(next);
    localStorage.setItem('nox_water_' + user.id + '_' + today, String(next));
    window.setTimeout(() => setWaterSaving(false), 180);
  };

  const getNoxScore = () => {
    return calculateNoxScore({
      workoutCount,
      weekWorkouts,
      weekPlanned: profile?.available_days?.length || 4,
      prCount,
      hasWeight: !!latestWeight,
      hasFuel: todayKcal > 0,
      todayKcal,
      targetKcal: targetKcal || 0,
      streak: profile?.streak_days || 0,
      xp,
    });
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: BG,
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <Sparkles size={24} color={TEXT} style={{ marginBottom: 10 }} />
          <div style={{ color: TEXT, fontWeight: 950, letterSpacing: '.18em', fontSize: 14 }}>NOX</div>
        </div>
      </div>
    );
  }

  const noxScore = getNoxScore();
  const firstName = profile?.display_name?.split(' ')[0] || 'ATHLÈTE';
  const sessionGoal = program?.days_per_week || program?.program_json?.days_per_week || 3;
  const remainingKcal = targetKcal ? Math.max(0, targetKcal - todayKcal) : null;
  const briefLabel = dayPeriod==='morning' ? 'NOX MORNING BRIEF' : dayPeriod==='evening' ? 'NOX EVENING RECAP' : 'NOX DAILY BRIEF';
  const briefTitle = dayPeriod==='morning' ? 'TA JOURNÉE COMMENCE ICI' : dayPeriod==='evening' ? 'LE RÉCAP DE TA JOURNÉE' : 'TA JOURNÉE EN 10 SECONDES';
  const weightToGoal = latestWeight!==null&&goalWeight!==null ? latestWeight-goalWeight : null;
  const nutritionProgress = targetKcal ? Math.min(1, todayKcal / targetKcal) : 0;
  const proteinProgress = targetProtein ? Math.min(1, todayProtein / targetProtein) : 0;
  const activityProgress = Math.min(1, todayActivityMinutes / 30);
  const stepProgress = stepGoal > 0 ? Math.min(1, todaySteps / stepGoal) : 0;
  const daySignals = [todayFoodCount > 0, nutritionProgress >= .7, proteinProgress >= .7, todayActivityMinutes >= 20 || todayWorkouts > 0, todayWaterMl >= waterGoal * .7];
  const consistencySignals = daySignals.filter(Boolean).length;

  return (
    <div style={{ minHeight: '100vh', background: BG, color: TEXT, paddingBottom: 104 }}>
      <main style={{ width: '100%', maxWidth: 560, margin: '0 auto' }}>
        <header
          style={{
            padding: '22px 20px 18px',
            background:
              'radial-gradient(circle at 90% 0%, rgba(200,255,0,.065), transparent 32%), linear-gradient(180deg,#FFFFFF 0%,#F7F7F7 100%)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 18 }}>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 10,
                  color: '#747474',
                  textTransform: 'uppercase',
                  letterSpacing: '.14em',
                  fontWeight: 800,
                }}
              >
                {greet()}
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 9,
                  marginTop: 5,
                  fontSize: 26,
                  lineHeight: 1.02,
                  fontWeight: 950,
                  letterSpacing: '-.035em',
                }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{firstName}</span>
                <Sparkles size={20} color={ACCENT} fill="rgba(200,255,0,.13)" />
              </div>

              {profile?.streak_days > 0 && (
                <div
                  style={{
                    marginTop: 12,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 7,
                    border: '1px solid rgba(255,138,55,.2)',
                    background: 'rgba(255,138,55,.07)',
                    borderRadius: 999,
                    padding: '7px 10px',
                    color: '#ff9b4a',
                    fontSize: 11,
                    fontWeight: 850,
                  }}
                >
                  <Flame size={14} fill="rgba(255,155,74,.25)" />
                  {profile.streak_days} jours de régularité
                </div>
              )}
            </div>

            <NoxScore score={noxScore} />
          </div>
        </header>

        <section style={{ padding: '0 20px 22px' }}>
          <div
            style={{
              ...cardStyle,
              overflow: 'hidden',
              position: 'relative',
              padding: 22,
              marginBottom: 14,
              borderColor: isRestDay ? BORDER : 'rgba(200,255,0,.22)',
            }}
          >
            <div
              style={{
                position: 'absolute',
                width: 180,
                height: 180,
                borderRadius: '50%',
                right: -85,
                top: -90,
                background: isRestDay ? 'rgba(255,255,255,.025)' : 'rgba(200,255,0,.055)',
                filter: 'blur(4px)',
              }}
            />

            <div style={{ position: 'relative' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 7,
                    fontSize: 10,
                    color: '#7c7c7c',
                    textTransform: 'uppercase',
                    letterSpacing: '.11em',
                    fontWeight: 850,
                  }}
                >
                  {isRestDay ? <MoonStar size={14} /> : <Activity size={14} color={ACCENT} />}
                  Aujourd'hui {isRestDay ? '' : `· ${todayDay}`}
                </div>

                {!isRestDay && (
                  <div
                    style={{
                      fontSize: 9,
                      textTransform: 'uppercase',
                      letterSpacing: '.08em',
                      fontWeight: 900,
                      color: '#4D6800',
                      padding: '5px 8px',
                      border: '1px solid rgba(200,255,0,.22)',
                      background: 'rgba(200,255,0,.07)',
                      borderRadius: 999,
                    }}
                  >
                    Plan actif
                  </div>
                )}
              </div>

              <div style={{ fontSize: 24, fontWeight: 950, letterSpacing: '-.035em', lineHeight: 1.05 }}>
                {isRestDay ? 'JOUR DE RÉCUPÉRATION' : todaySession?.name || 'SÉANCE DU JOUR'}
              </div>

              <div style={{ color: MUTED, fontSize: 13, lineHeight: 1.55, marginTop: 9 }}>
                {isRestDay
                  ? 'Aucune séance n’est planifiée aujourd’hui. Tu peux suivre ta nutrition, ton activité et ta récupération comme d’habitude.'
                  : `${todaySession?.exercises?.length || 0} exercices · ${
                      todaySession?.duration || program?.program_json?.session_length_min || 60
                    } min · séance adaptée à ton plan.`}
              </div>

              {isRestDay ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginTop: 20 }}>
                  <button
                    onClick={() => navigate('/body')}
                    style={{
                      minHeight: 46,
                      borderRadius: 13,
                      border: '1px solid rgba(200,255,0,.2)',
                      background: 'rgba(200,255,0,.07)',
                      color: TEXT,
                      fontWeight: 900,
                      fontSize: 11,
                      textTransform: 'uppercase',
                      letterSpacing: '.05em',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 7,
                    }}
                  >
                    <ScanLine size={16} />
                    Progrès
                  </button>

                  <button
                    onClick={() => navigate('/fuel')}
                    style={{
                      minHeight: 46,
                      borderRadius: 13,
                      border: `1px solid ${BORDER}`,
                      background: '#FFFFFF',
                      color: TEXT,
                      fontWeight: 900,
                      fontSize: 11,
                      textTransform: 'uppercase',
                      letterSpacing: '.05em',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 7,
                    }}
                  >
                    <Apple size={16} />
                    Nutrition
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => navigate('/training/' + (todaySessionIdx ?? 0))}
                  style={{
                    width: '100%',
                    minHeight: 50,
                    marginTop: 20,
                    border: 'none',
                    borderRadius: 14,
                    background: ACCENT,
                    color: '#050505',
                    fontSize: 12,
                    fontWeight: 950,
                    textTransform: 'uppercase',
                    letterSpacing: '.06em',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 9,
                    boxShadow: '0 10px 28px rgba(200,255,0,.14)',
                  }}
                >
                  <Play size={16} fill="#050505" />
                  Commencer la séance
                </button>
              )}
            </div>
          </div>

          <button onClick={()=>navigate('/fuel')} style={{...cardStyle,width:'100%',padding:18,marginBottom:14,textAlign:'left',cursor:'pointer',color:TEXT}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}}><div><div style={{fontSize:10,fontWeight:900,letterSpacing:'.1em',color:MUTED}}>NUTRITION AUJOURD'HUI</div><div style={{fontSize:20,fontWeight:950,marginTop:4}}>{Math.round(todayKcal)} <span style={{fontSize:12,color:MUTED}}>/ {targetKcal ? Math.round(targetKcal) : '—'} kcal</span></div></div><ChevronRight size={18}/></div>
            <div style={{height:7,borderRadius:99,background:SURFACE_2,overflow:'hidden',marginTop:13}}><div style={{height:'100%',width:`${targetKcal?Math.min(100,(todayKcal/targetKcal)*100):0}%`,background:ACCENT,borderRadius:99}}/></div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:7,marginTop:12}}>
              <div style={{background:SURFACE_2,borderRadius:12,padding:10}}><b>{Math.round(todayProtein)}g</b><div style={{fontSize:8.5,color:MUTED,marginTop:3}}>PROTÉINES</div></div>
              <div style={{background:SURFACE_2,borderRadius:12,padding:10}}><b>{Math.round(todayCarbs)}g</b><div style={{fontSize:8.5,color:MUTED,marginTop:3}}>GLUCIDES</div></div>
              <div style={{background:SURFACE_2,borderRadius:12,padding:10}}><b>{Math.round(todayFat)}g</b><div style={{fontSize:8.5,color:MUTED,marginTop:3}}>LIPIDES</div></div>
            </div>
            <div style={{fontSize:10.5,color:MUTED,marginTop:9}}>{remainingKcal===null?'Ajoute ta cible dans Nutrition pour afficher le restant.':`${Math.round(remainingKcal)} kcal restantes sur ton repère actuel`}</div>
          </button>

          <div style={{...cardStyle,padding:18,marginBottom:14}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}}>
              <div><div style={{fontSize:10,fontWeight:900,letterSpacing:'.1em',color:MUTED}}>REPAS AUJOURD'HUI</div><div style={{fontSize:18,fontWeight:950,marginTop:4}}>{todayFoodCount ? todayFoodCount+' ENREGISTRÉ'+(todayFoodCount>1?'S':'') : 'AUCUN REPAS'}</div></div>
              <button onClick={()=>navigate('/fuel')} style={{border:0,background:'transparent',fontSize:10,fontWeight:900,cursor:'pointer'}}>VOIR <ArrowRight size={12} style={{verticalAlign:'middle'}}/></button>
            </div>
            {todayMeals.length===0?<button onClick={()=>navigate('/food-scan',{state:{scanMode:'meal'}})} style={{width:'100%',marginTop:12,padding:13,border:'1px dashed '+BORDER,borderRadius:13,background:SURFACE_2,textAlign:'left',fontSize:11,fontWeight:850,cursor:'pointer'}}>+ Scanner ou ajouter ton premier repas</button>:<div style={{marginTop:11}}>{todayMeals.slice(-3).reverse().map((item:any)=><div key={item.id} style={{display:'flex',justifyContent:'space-between',gap:10,padding:'9px 0',borderTop:'1px solid '+BORDER}}><div style={{minWidth:0}}><div style={{fontSize:11.5,fontWeight:850,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{item.food_name||'Repas'}</div><div style={{fontSize:9.5,color:MUTED,marginTop:2}}>{item.meal_type||'Repas'}</div></div><div style={{fontSize:11,fontWeight:900,whiteSpace:'nowrap'}}>{Math.round(Number(item.calories||0))} kcal</div></div>)}</div>}
          </div>

          <div style={{...cardStyle,padding:18,marginBottom:14}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}}>
              <div><div style={{fontSize:10,fontWeight:900,letterSpacing:'.1em',color:MUTED}}>ACTIVITÉ AUJOURD'HUI</div><div style={{fontSize:18,fontWeight:950,marginTop:4}}>TON MOUVEMENT</div></div>
              <button onClick={()=>navigate('/activity')} style={{border:0,background:'transparent',fontSize:10,fontWeight:900,cursor:'pointer'}}>VOIR <ArrowRight size={12} style={{verticalAlign:'middle'}}/></button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:6,marginTop:12}}>
              {[[todaySteps,'PAS'],[Math.round(todayActivityMinutes),'MIN'],[todayDistanceKm.toFixed(1),'KM'],[Math.round(todayActiveCalories),'KCAL']].map(([value,label])=><div key={String(label)} style={{background:SURFACE_2,borderRadius:12,padding:'10px 5px',textAlign:'center'}}><strong style={{fontSize:14}}>{value}</strong><div style={{fontSize:8,color:MUTED,marginTop:3}}>{label}</div></div>)}
            </div>
            <div style={{marginTop:11}}>
              <div style={{display:'flex',justifyContent:'space-between',gap:10,fontSize:9.5,color:MUTED}}><span>OBJECTIF PAS</span><span>{todaySteps.toLocaleString('fr-FR')} / {stepGoal.toLocaleString('fr-FR')}</span></div>
              <div style={{height:6,borderRadius:99,background:SURFACE_2,overflow:'hidden',marginTop:6}}><div style={{height:'100%',width:`${stepProgress*100}%`,background:ACCENT,borderRadius:99}}/></div>
            </div>
          </div>

          <div style={{...cardStyle,width:'100%',boxSizing:'border-box',padding:18,marginBottom:14,color:TEXT}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
              <div><div style={{fontSize:10,fontWeight:900,letterSpacing:'.1em',color:MUTED}}>HYDRATATION</div><div style={{fontSize:19,fontWeight:950,marginTop:4}}>{Math.round(todayWaterMl)} <span style={{fontSize:12,color:MUTED}}>/ {waterGoal.toLocaleString('fr-FR')} ml</span></div></div>
              <button onClick={()=>navigate('/fasting')} aria-label="Ouvrir le suivi hydratation" style={{width:40,height:40,border:0,borderRadius:13,background:'#EEF5FF',color:'#4488ff',display:'grid',placeItems:'center',cursor:'pointer'}}><Droplets size={20}/></button>
            </div>
            <div style={{height:7,borderRadius:99,background:SURFACE_2,overflow:'hidden',marginTop:13}}><div style={{height:'100%',width:`${Math.min(100,(todayWaterMl/waterGoal)*100)}%`,background:'#4488ff',borderRadius:99}}/></div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:7,marginTop:11}}>
              {[150,250,500].map(ml=><button key={ml} onClick={()=>addWater(ml)} disabled={waterSaving} style={{padding:'9px 0',border:'1px solid #DCE8FF',borderRadius:10,background:'#F6F9FF',color:'#2F6FD0',fontSize:11,fontWeight:900,cursor:'pointer'}}>+{ml} ml</button>)}
            </div>
          </div>

          {latestSleepHours!==null&&<button onClick={()=>navigate('/recovery')} style={{...cardStyle,width:'100%',padding:18,marginBottom:14,textAlign:'left',cursor:'pointer',color:TEXT}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}><div><div style={{fontSize:10,fontWeight:900,letterSpacing:'.1em',color:MUTED}}>SOMMEIL & RÉCUPÉRATION</div><div style={{fontSize:19,fontWeight:950,marginTop:4}}>{latestSleepHours.toFixed(1)} <span style={{fontSize:12,color:MUTED}}>h de sommeil</span></div></div><span style={{width:40,height:40,borderRadius:13,background:SURFACE_2,display:'grid',placeItems:'center'}}><MoonStar size={20}/></span></div>
            <div style={{fontSize:10.5,color:MUTED,marginTop:9}}>Dernière donnée disponible · ouvre Récupération pour le contexte détaillé.</div>
          </button>}

          <div style={{...cardStyle,padding:18,marginBottom:14}}>
            <div style={{fontSize:10,fontWeight:900,letterSpacing:'.1em',color:MUTED}}>{briefLabel}</div>
            <div style={{fontSize:19,fontWeight:950,marginTop:5}}>{briefTitle}</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:7,marginTop:13}}>
              <div style={{background:SURFACE_2,borderRadius:13,padding:10}}><strong>{Math.round(todayKcal)} / {targetKcal ? Math.round(targetKcal) : '—'}</strong><div style={{fontSize:9,color:MUTED,marginTop:3}}>KCAL</div></div>
              <div style={{background:SURFACE_2,borderRadius:13,padding:10}}><strong>{Math.round(todayProtein)}{targetProtein ? ` / ${Math.round(targetProtein)}` : ''}g</strong><div style={{fontSize:9,color:MUTED,marginTop:3}}>PROTÉINES</div></div>
              <div style={{background:SURFACE_2,borderRadius:13,padding:10}}><strong>{Math.round(todayActivityMinutes)}</strong><div style={{fontSize:9,color:MUTED,marginTop:3}}>MIN ACTIVES</div></div>
            </div>
            <div style={{fontSize:11.5,color:MUTED,lineHeight:1.5,marginTop:11}}>{todayKcal===0&&todayActivityMinutes===0?'Commence ta journée : ajoute ton premier repas ou une activité.':dayPeriod==='evening'?`${consistencySignals}/5 repères de suivi renseignés aujourd’hui${todayMealTypes.length ? ` · ${todayMealTypes.length} type${todayMealTypes.length>1?'s':''} de repas enregistré${todayMealTypes.length>1?'s':''}` : ''}. Consulte les cartes ci-dessus pour compléter ce qui compte pour toi.`:remainingKcal===null?'Ajoute ta cible dans Nutrition pour afficher ton repère calorique quotidien.':remainingKcal>0?`Il te reste environ ${Math.round(remainingKcal)} kcal sur ton repère actuel. Continue à enregistrer ta journée pour garder une vue complète.`:'Tes apports enregistrés ont atteint ton repère calorique actuel. Consulte Nutrition pour le détail.'}</div>
          </div>

          {latestWeight!==null&&<button onClick={()=>navigate('/body')} style={{...cardStyle,width:'100%',padding:18,marginBottom:14,textAlign:'left',cursor:'pointer',color:TEXT}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}}><div><div style={{fontSize:10,fontWeight:900,letterSpacing:'.1em',color:MUTED}}>PROGRÈS PHYSIQUE</div><div style={{fontSize:20,fontWeight:950,marginTop:4}}>{latestWeight} <span style={{fontSize:12,color:MUTED}}>kg</span></div></div><ChevronRight size={18}/></div>
            <div style={{fontSize:10.5,color:MUTED,marginTop:9}}>{weightToGoal===null?'Dernier poids enregistré · ajoute un objectif dans Progrès pour suivre l’écart.':Math.abs(weightToGoal)<0.05?'Objectif de poids enregistré atteint.':`${Math.abs(weightToGoal).toFixed(1)} kg d’écart avec ton objectif actuel · suis la tendance dans Progrès.`}</div>
          </button>}

          <div style={{...cardStyle,padding:18,marginBottom:14,background:TEXT,color:'#fff'}}>
            <div style={{fontSize:10,fontWeight:900,letterSpacing:'.1em',color:ACCENT}}>NOX DAILY SCORE</div>
            <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:12,marginTop:5}}><div><span style={{fontSize:34,fontWeight:950,lineHeight:1}}>{noxScore}</span><span style={{fontSize:12,color:'#777'}}> / 100</span></div><div style={{fontSize:10,color:'#999',textAlign:'right'}}>RÉGULARITÉ<br/>PERSONNELLE</div></div>
            <div style={{height:7,borderRadius:99,background:'#242424',overflow:'hidden',marginTop:13}}><div style={{height:'100%',width:`${Math.max(0,Math.min(100,noxScore))}%`,background:ACCENT,borderRadius:99}}/></div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:7,marginTop:12}}>
              <div style={{background:'#171717',borderRadius:12,padding:9}}><b>{todayFoodCount}</b><div style={{fontSize:8.5,color:'#777',marginTop:3}}>ENTRÉES NUTRITION</div></div>
              <div style={{background:'#171717',borderRadius:12,padding:9}}><b>{Math.round(todayActivityMinutes)}</b><div style={{fontSize:8.5,color:'#777',marginTop:3}}>MIN ACTIVES</div></div>
              <div style={{background:'#171717',borderRadius:12,padding:9}}><b>{todayWorkouts}</b><div style={{fontSize:8.5,color:'#777',marginTop:3}}>SÉANCES AUJ.</div></div>
            </div>
            <div style={{fontSize:9.5,color:'#777',lineHeight:1.45,marginTop:10}}>Score de constance personnel basé sur les données enregistrées dans NOX. Ce n’est pas un score médical.</div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              margin: '20px 2px 11px',
            }}
          >
            <div>
              <div style={{ fontSize: 15, fontWeight: 900, letterSpacing: '-.02em' }}>Vue d'ensemble</div>
              <div style={{ marginTop: 3, fontSize: 11, color: '#777777' }}>Tes indicateurs utiles aujourd'hui</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 10 }}>
            <MetricCard
              icon={Dumbbell}
              eyebrow="Training"
              value={`${weekWorkouts}/${sessionGoal}`}
              detail={`${workoutCount} séances au total`}
              onClick={() => navigate('/program')}
            />
            <MetricCard
              icon={BarChart3}
              eyebrow="Progrès"
              value={latestWeight ? `${latestWeight} kg` : '—'}
              detail={latestWeight ? 'Dernier poids enregistré' : 'Ajoute ton premier poids'}
              onClick={() => navigate('/body')}
            />
            <MetricCard
              icon={Apple}
              eyebrow="Nutrition"
              value={todayKcal ? `${todayKcal}` : '0'}
              detail={todayKcal ? (remainingKcal===null ? 'Définis ta cible dans Nutrition' : `${Math.round(remainingKcal)} kcal restantes`) : 'Commence ton suivi nutrition'}
              onClick={() => navigate('/fuel')}
            />
            <MetricCard
              icon={Trophy}
              eyebrow="Progression"
              value={`${prCount} PR`}
              detail={`${xp} XP · progression NOX`}
              onClick={() => navigate('/play')}
            />
          </div>

          <button
            onClick={() => navigate('/future')}
            style={{
              ...cardStyle,
              width: '100%',
              marginTop: 12,
              padding: 0,
              overflow: 'hidden',
              textAlign: 'left',
              cursor: 'pointer',
              color: TEXT,
            }}
          >
            <div
              style={{
                minHeight: 150,
                position: 'relative',
                padding: 20,
                display: 'flex',
                alignItems: 'flex-end',
                background:
                  'radial-gradient(circle at 82% 35%, rgba(200,255,0,.16), transparent 24%), linear-gradient(135deg,#FFFFFF 0%,#FFFFFF 100%)',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 18,
                  left: 20,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  color: ACCENT,
                  fontSize: 9.5,
                  fontWeight: 900,
                  letterSpacing: '.11em',
                  textTransform: 'uppercase',
                }}
              >
                <WandSparkles size={14} />
                Projection NOX
              </div>

              <div style={{ maxWidth: '78%' }}>
                <div style={{ fontSize: 21, fontWeight: 950, letterSpacing: '-.03em' }}>NOX FUTURE</div>
                <div style={{ fontSize: 12.5, color: '#777777', lineHeight: 1.5, marginTop: 6 }}>
                  Suis une tendance indicative construite à partir de tes données enregistrées. Elle évolue avec ton suivi et ne constitue pas une date garantie.
                </div>
              </div>

              <div
                style={{
                  position: 'absolute',
                  right: 18,
                  bottom: 18,
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  background: ACCENT,
                  color: '#050505',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <ArrowRight size={18} />
              </div>
            </div>
          </button>

          <div style={{ margin: '22px 2px 10px', fontSize: 11, fontWeight: 900, color: '#777', letterSpacing: '.09em', textTransform: 'uppercase' }}>
            Accès rapide {todayWaterMl > 0 ? '· ' + todayWaterMl + ' ml d’eau' : ''}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 9 }}>
            {[
              { label: 'Scanner', icon: ScanLine, path: '/food-scan' },
              { label: 'Hydratation', icon: Droplets, path: '/fasting' },
              { label: 'Profil', icon: UserRound, path: '/settings' },
            ].map(({ label, icon: Icon, path }) => (
              <button
                key={label}
                onClick={() => navigate(path)}
                style={{
                  minHeight: 82,
                  borderRadius: 17,
                  border: `1px solid ${BORDER}`,
                  background: SURFACE,
                  color: TEXT,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 9,
                }}
              >
                <Icon size={18} color={ACCENT} />
                <span style={{ fontSize: 10.5, fontWeight: 850, color: '#555555' }}>{label}</span>
              </button>
            ))}
          </div>

          <div
            style={{
              marginTop: 16,
              padding: '14px 16px',
              borderRadius: 16,
              border: '1px solid rgba(0,0,0,.06)',
              background: 'rgba(0,0,0,.02)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <Sparkles size={15} color={ACCENT} />
            <div style={{ flex: 1, fontSize: 11.5, lineHeight: 1.45, color: '#777' }}>
              Tout ton progrès. Un seul endroit. Tes données enregistrées personnalisent progressivement tes repères et tes synthèses.
            </div>
            <ChevronRight size={16} color="#999999" />
          </div>
        </section>
      </main>

      <BottomNav active="home" />
    </div>
  );
}
