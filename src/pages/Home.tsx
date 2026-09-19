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
        boxShadow: '0 0 28px rgba(183,255,0,.08)',
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
  const [targetCarbs, setTargetCarbs] = useState<number | null>(null);
  const [targetFat, setTargetFat] = useState<number | null>(null);
  const [nutritionTargetLoading, setNutritionTargetLoading] = useState(true);
  const [todayActivityMinutes, setTodayActivityMinutes] = useState(0);
  const [dayPeriod, setDayPeriod] = useState<'morning'|'day'|'evening'>(() => { const h=new Date().getHours(); return h<12?'morning':h<18?'day':'evening'; });
  const [todayFoodCount, setTodayFoodCount] = useState(0);
  const [todayMealCount, setTodayMealCount] = useState(0);
  const [weekFoodDays, setWeekFoodDays] = useState(0);
  const [todayMealTypes, setTodayMealTypes] = useState<string[]>([]);
  const [todayMeals, setTodayMeals] = useState<any[]>([]);
  const [todayWaterMl, setTodayWaterMl] = useState(0);
  const [waterGoal, setWaterGoal] = useState(2500);
  const [waterSaving, setWaterSaving] = useState(false);
  const [waterMessage, setWaterMessage] = useState('');
  const [todaySteps, setTodaySteps] = useState(0);
  const [stepGoal, setStepGoal] = useState(10000);
  const [todayDistanceKm, setTodayDistanceKm] = useState(0);
  const [todayActiveCalories, setTodayActiveCalories] = useState(0);
  const [todayImportedCalories, setTodayImportedCalories] = useState(0);
  const [todayWorkouts, setTodayWorkouts] = useState(0);
  const [todayWorkoutMinutes, setTodayWorkoutMinutes] = useState(0);
  const [todayWorkoutCalories, setTodayWorkoutCalories] = useState(0);
  const [targetKcal, setTargetKcal] = useState<number | null>(null);
  const [nutritionTargetSource, setNutritionTargetSource] = useState<'nutrition'|'none'>('none');
  const [latestWeight, setLatestWeight] = useState<number | null>(null);
  const [goalWeight, setGoalWeight] = useState<number | null>(null);
  const [latestSleepHours, setLatestSleepHours] = useState<number | null>(null);
  const [latestSleepHrv, setLatestSleepHrv] = useState<number | null>(null);
  const [latestRestingHr, setLatestRestingHr] = useState<number | null>(null);
  const [latestSleepDate, setLatestSleepDate] = useState<string | null>(null);
  const [xp, setXp] = useState(0);
  const [tomorrowMealPlanned, setTomorrowMealPlanned] = useState(false);
  const [todayActivitySources, setTodayActivitySources] = useState<string[]>([]);
  const [activityDuplicatesSkipped, setActivityDuplicatesSkipped] = useState(0);
  const [recentActivityKeys, setRecentActivityKeys] = useState<string[]>([]);
  const [todayWeightLogged, setTodayWeightLogged] = useState(false);
  const [tomorrowMealCount, setTomorrowMealCount] = useState(0);
  const [todayPlannedMeals, setTodayPlannedMeals] = useState(0);
  const [loading, setLoading] = useState(true);
  const [habits] = useState(() => [
    { id: 'nutrition', label: 'Suivre ma nutrition' },
    { id: 'activity', label: 'Bouger au moins 20 min' },
    { id: 'water', label: 'Atteindre mon hydratation' },
  ]);
  const [habitOverrides, setHabitOverrides] = useState<Record<string, boolean>>({});

  const days = ['DIM', 'LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM'];
  const todayDay = days[new Date().getDay()];
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const tomorrowDate = new Date(now); tomorrowDate.setDate(tomorrowDate.getDate()+1);
  const tomorrow = `${tomorrowDate.getFullYear()}-${String(tomorrowDate.getMonth()+1).padStart(2,'0')}-${String(tomorrowDate.getDate()).padStart(2,'0')}`;
  const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

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
        { data: todayWorkoutLogs },
        { data: fuel },
        { data: weekFuel },
        { data: bodyLogs },
        { data: todayBodyLogs },
        { data: todayActivity },
        { data: nutritionTarget },
        { data: recoveryLogs },
        { data: tomorrowMeals },
        { data: todayPlannedMeals },
        { data: recentActivities },
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
          .from('workouts')
          .select('id, completed_at, created_at, duration_minutes, calories_burned')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .gte('completed_at', todayStart)
          .lt('completed_at', tomorrowStart),
        supabase
          .from('food_entries')
          .select('id, meal_type, food_name, calories, protein, carbs, fat, created_at')
          .eq('user_id', user.id)
          .gte('created_at', todayStart).lt('created_at', tomorrowStart),
        supabase
          .from('food_entries')
          .select('created_at')
          .eq('user_id', user.id)
          .gte('created_at', weekStart),
        supabase
          .from('body_logs')
          .select('weight')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1),
        supabase.from('body_logs').select('id').eq('user_id', user.id).gte('created_at', todayStart).lt('created_at', tomorrowStart),
        supabase.from('activity_logs').select('duration_minutes, distance_km, calories_burned, steps, source').eq('user_id', user.id).gte('performed_at', todayStart).lt('performed_at', tomorrowStart),
        supabase.from('nutrition_targets').select('calories, protein, carbs, fat').eq('user_id', user.id).maybeSingle(),
        supabase.from('recovery_logs').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1),
        supabase.from('meal_plans').select('id').eq('user_id', user.id).eq('planned_date', tomorrow),
        supabase.from('meal_plans').select('id').eq('user_id', user.id).eq('planned_date', today).eq('logged', false),
        supabase.from('activity_logs').select('activity_type, duration_minutes, performed_at, source').eq('user_id', user.id).gte('performed_at', todayStart).lt('performed_at', tomorrowStart),
      ]);

      setProfile(prof);
      setProgram(prog);
      setWorkoutCount(logs?.length || 0);
      setPrCount(prs?.length || 0);
      setWeekWorkouts(weekLogs?.length || 0);
      setTodayWorkouts(todayWorkoutLogs?.length || 0);
      setTodayWorkoutMinutes((todayWorkoutLogs || []).reduce((sum: number, item: any) => {
        const explicit=Number(item.duration_minutes||0);
        if(explicit>0)return sum+explicit;
        const start=new Date(item.created_at).getTime(); const end=item.completed_at?new Date(item.completed_at).getTime():start;
        return sum + Math.max(0, Math.round((end-start)/60000));
      }, 0));
      setTodayWorkoutCalories((todayWorkoutLogs || []).reduce((sum:number,item:any)=>sum+Number(item.calories_burned||0),0));
      setTodayKcal(fuel?.reduce((sum: number, item: any) => sum + (item.calories || 0), 0) || 0);
      setTodayProtein(fuel?.reduce((sum: number, item: any) => sum + Number(item.protein || 0), 0) || 0);
      setTodayCarbs(fuel?.reduce((sum: number, item: any) => sum + Number(item.carbs || 0), 0) || 0);
      setTodayFat(fuel?.reduce((sum: number, item: any) => sum + Number(item.fat || 0), 0) || 0);
      setTodayFoodCount(fuel?.length || 0);
      setTodayMealCount(new Set((fuel || []).map((item:any)=>String(item.meal_type||'')).filter(Boolean)).size);
      setWeekFoodDays(new Set((weekFuel || []).map((item: any) => String(item.created_at || '').slice(0, 10)).filter(Boolean)).size);
      setTodayMeals(fuel || []);
      setTodayMealTypes(Array.from(new Set((fuel || []).map((item: any) => String(item.meal_type || '')).filter(Boolean))));
      const storedHabits = localStorage.getItem('nox_habits_' + user.id + '_' + today);
      if (storedHabits) {
        try { setHabitOverrides(JSON.parse(storedHabits)); } catch { setHabitOverrides({}); }
      } else setHabitOverrides({});
      const storedWater = Number(localStorage.getItem('nox_water_' + user.id + '_' + today) || 0);
      const storedWaterGoal = Number(localStorage.getItem('nox_water_goal_' + user.id) || 2500);
      setTodayWaterMl(Number.isFinite(storedWater) ? storedWater : 0);
      setWaterGoal(Number.isFinite(storedWaterGoal) && storedWaterGoal > 0 ? storedWaterGoal : 2500);
      const uniqueActivity = (todayActivity || []).filter((item:any,index:number,all:any[])=>{const key=`${String(item.activity_type||'').toLowerCase()}|${Math.round(Number(item.duration_minutes||0))}|${String(item.performed_at||'').slice(0,13)}`;return all.findIndex((candidate:any)=>`${String(candidate.activity_type||'').toLowerCase()}|${Math.round(Number(candidate.duration_minutes||0))}|${String(candidate.performed_at||'').slice(0,13)}`===key)===index;});
      setActivityDuplicatesSkipped(Math.max(0,(todayActivity?.length||0)-uniqueActivity.length));
      setTodayActivityMinutes(uniqueActivity.reduce((sum: number, item: any) => sum + Number(item.duration_minutes || 0), 0) || 0);
      setTodayActivitySources(Array.from(new Set(uniqueActivity.map((item:any)=>String(item.source||'manual')).filter(Boolean))));
      setRecentActivityKeys((recentActivities || []).map((item:any)=>`${String(item.activity_type||'').toLowerCase()}|${Math.round(Number(item.duration_minutes||0))}|${String(item.performed_at||'').slice(0,13)}`));
      setTodaySteps(uniqueActivity.reduce((sum: number, item: any) => sum + Number(item.steps || 0), 0) || 0);
      const profileStepGoal = Number(prof?.step_goal ?? prof?.daily_steps_goal ?? prof?.steps_goal ?? 10000);
      setStepGoal(Number.isFinite(profileStepGoal) && profileStepGoal > 0 ? profileStepGoal : 10000);
      setTodayDistanceKm(uniqueActivity.reduce((sum: number, item: any) => sum + Number(item.distance_km || 0), 0) || 0);
      setTodayActiveCalories(uniqueActivity.reduce((sum: number, item: any) => sum + Number(item.calories_burned || 0), 0) || 0);
      setTodayImportedCalories(uniqueActivity.filter((item:any)=>String(item.source||'manual')!=='manual').reduce((sum:number,item:any)=>sum+Number(item.calories_burned||0),0));
      const centralizedTarget = Number(nutritionTarget?.calories || 0);
      setNutritionTargetSource(centralizedTarget > 0 ? 'nutrition' : 'none');
      setTargetKcal(centralizedTarget > 0 ? centralizedTarget : null);
      const centralizedProtein = Number(nutritionTarget?.protein || 0);
      setTargetProtein(centralizedProtein > 0 ? centralizedProtein : null);
      const centralizedCarbs = Number(nutritionTarget?.carbs || 0);
      const centralizedFat = Number(nutritionTarget?.fat || 0);
      setTargetCarbs(centralizedCarbs > 0 ? centralizedCarbs : null);
      setTargetFat(centralizedFat > 0 ? centralizedFat : null);
      setNutritionTargetLoading(false);
      setLatestWeight(bodyLogs?.[0]?.weight || null);
      setTodayWeightLogged((todayBodyLogs?.length || 0) > 0);
      const profileGoalWeight = Number(prof?.goal_weight_kg ?? prof?.goal_weight ?? prof?.target_weight ?? 0);
      setGoalWeight(Number.isFinite(profileGoalWeight) && profileGoalWeight > 0 ? profileGoalWeight : null);
      const recovery = recoveryLogs?.[0];
      const sleepHours = Number(recovery?.sleep_hours ?? recovery?.sleep_duration_hours ?? recovery?.sleep_duration ?? 0);
      setLatestSleepHours(Number.isFinite(sleepHours) && sleepHours > 0 ? sleepHours : null);
      const hrv = Number(recovery?.hrv ?? recovery?.hrv_ms ?? 0);
      const restingHr = Number(recovery?.resting_heart_rate ?? recovery?.resting_hr ?? 0);
      setLatestSleepHrv(Number.isFinite(hrv) && hrv > 0 ? hrv : null);
      setLatestRestingHr(Number.isFinite(restingHr) && restingHr > 0 ? restingHr : null);
      setLatestSleepDate(recovery?.created_at || recovery?.recorded_at || null);
      setXp(prof?.xp || 0);
      setTomorrowMealPlanned((tomorrowMeals?.length || 0) > 0);
      setTomorrowMealCount(tomorrowMeals?.length || 0);
      setTodayPlannedMeals(todayPlannedMeals?.length || 0);

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

  const updateWater = (next: number) => {
    if (!user || waterSaving) return;
    setWaterSaving(true);
    const safe = Math.max(0, next);
    setTodayWaterMl(safe);
    localStorage.setItem('nox_water_' + user.id + '_' + today, String(safe));
    setWaterMessage(safe === 0 ? 'Hydratation remise à zéro.' : safe + ' ml enregistrés aujourd’hui.');
    window.setTimeout(() => { setWaterSaving(false); setWaterMessage(''); }, 1400);
  };

  const addWater = (ml: number) => updateWater(todayWaterMl + ml);

  const nutritionProgress = effectiveTargetKcal ? todayKcal / effectiveTargetKcal : null;
  const proteinProgress = targetProtein ? todayProtein / targetProtein : null;
  const briefInsight = dayPeriod === 'morning'
    ? (todayKcal === 0
        ? 'Aucun repas enregistré pour le moment. Ajoute ce que tu consommes quand ta journée commence.'
        : `${todayMealCount} repas renseigné${todayMealCount > 1 ? 's' : ''} · ton suivi se construit au fil de la journée.`)
    : dayPeriod === 'evening'
      ? (nutritionProgress !== null && proteinProgress !== null
          ? `Apports enregistrés : ${Math.round(nutritionProgress * 100)}% du repère calorique et ${Math.round(proteinProgress * 100)}% du repère protéines. Ces pourcentages décrivent uniquement les données saisies.`
          : `${consistencySignals}/5 repères renseignés aujourd’hui. Les données manquantes ne sont pas estimées.`)
      : (totalActiveMinutes > 0
          ? `${Math.round(totalActiveMinutes)} min actives enregistrées jusqu’ici. Continue simplement à renseigner ce qui compte pour toi.`
          : 'Aucune activité enregistrée pour le moment. NOX attend tes données plutôt que d’estimer ce qui manque.');

  const trendExplanation = weekFoodDays >= 4 && weekWorkouts >= 2
    ? `Suivi récent suffisamment régulier pour comparer plusieurs piliers : nutrition enregistrée ${weekFoodDays}/7 jours et ${weekWorkouts} séance${weekWorkouts > 1 ? 's' : ''} sur 7 jours.`
    : `Tendance encore partielle : nutrition enregistrée ${weekFoodDays}/7 jours et ${weekWorkouts} séance${weekWorkouts > 1 ? 's' : ''} sur 7 jours. NOX évite de tirer une conclusion forte avec peu de données.`;

  const hasPossibleActivityDuplicate = (activityType: string, durationMinutes: number, performedAt: string) => {
    const key = `${String(activityType||'').toLowerCase()}|${Math.round(Number(durationMinutes||0))}|${String(performedAt||'').slice(0,13)}`;
    return recentActivityKeys.includes(key);
  };

  const updateWaterGoal = (next: number) => {
    if (!user) return;
    const safe = Math.max(250, Math.min(6000, Math.round(next / 250) * 250));
    setWaterGoal(safe);
    localStorage.setItem('nox_water_goal_' + user.id, String(safe));
    setWaterMessage('Objectif hydratation : ' + safe.toLocaleString('fr-FR') + ' ml.');
    window.setTimeout(() => setWaterMessage(''), 1400);
  };

  const toggleHabit = (id: string, automaticDone: boolean) => {
    if (!user || automaticDone) return;
    setHabitOverrides(prev => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem('nox_habits_' + user.id + '_' + today, JSON.stringify(next));
      return next;
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

  const firstName = profile?.display_name?.split(' ')[0] || 'ATHLÈTE';
  const effectiveTargetKcal = targetKcal && targetKcal > 0 ? targetKcal : null;
  const remainingKcal = effectiveTargetKcal === null ? null : Math.max(0, effectiveTargetKcal - todayKcal);
  const briefLabel = dayPeriod==='morning' ? 'NOX MORNING BRIEF' : dayPeriod==='evening' ? 'NOX EVENING RECAP' : 'NOX DAILY BRIEF';
  const briefTitle = dayPeriod==='morning' ? 'TA JOURNÉE COMMENCE ICI' : dayPeriod==='evening' ? 'LE RÉCAP DE TA JOURNÉE' : 'TA JOURNÉE EN 10 SECONDES';
  const weightToGoal = latestWeight!==null&&goalWeight!==null ? latestWeight-goalWeight : null;
  const sleepAgeHours = latestSleepDate ? (Date.now()-new Date(latestSleepDate).getTime())/3600000 : null;
  const freshSleepHours = sleepAgeHours!==null && sleepAgeHours>=0 && sleepAgeHours<=48 ? latestSleepHours : null;
  const nutritionProgress = effectiveTargetKcal ? Math.min(1, todayKcal / effectiveTargetKcal) : 0;
  const nutritionTargetLabel = nutritionTargetLoading ? 'Chargement cible' : nutritionTargetSource === 'nutrition' ? 'Cible Nutrition' : 'Cible à définir';
  const hasNutritionTarget = nutritionTargetSource === 'nutrition';
  const hasPersonalTarget = effectiveTargetKcal !== null && targetProtein !== null;
  const proteinProgress = targetProtein ? Math.min(1, todayProtein / targetProtein) : 0;
  const carbsProgress = targetCarbs ? Math.min(1, todayCarbs / targetCarbs) : 0;
  const fatProgress = targetFat ? Math.min(1, todayFat / targetFat) : 0;
  void carbsProgress; void fatProgress; void hasNutritionTarget;
  const totalActiveMinutes = todayActivityMinutes + todayWorkoutMinutes;
  const totalActiveCalories = todayActiveCalories + todayWorkoutCalories;
  const hasConnectedActivity = todayActivitySources.some(source => source !== 'manual' && source !== 'machine_scan');
  const nutritionTargetsReady = effectiveTargetKcal !== null && targetProtein !== null;
  const activitySourceLabel = (hasConnectedActivity ? 'Données synchronisées + NOX' : todayActivitySources.includes('machine_scan') ? 'NOX + écran cardio' : 'Données enregistrées dans NOX') + (activityDuplicatesSkipped > 0 ? ` · ${activityDuplicatesSkipped} doublon${activityDuplicatesSkipped>1?'s':''} ignoré${activityDuplicatesSkipped>1?'s':''}` : '');
  const activityProgress = Math.min(1, totalActiveMinutes / 30);
  const stepProgress = stepGoal > 0 ? Math.min(1, todaySteps / stepGoal) : 0;
  const mealCoverage = Math.min(1, todayMealCount / 3);
  const daySignals = [mealCoverage >= .67, ...(nutritionTargetsReady ? [nutritionProgress >= .7, proteinProgress >= .7] : []), totalActiveMinutes >= 20 || todayWorkouts > 0, todayWaterMl >= waterGoal * .7];
  const consistencySignals = daySignals.filter(Boolean).length;
  const dailyScore = daySignals.length ? Math.round((consistencySignals / daySignals.length) * 100) : 0;
  const dailyScoreLabel = `${consistencySignals}/${daySignals.length} REPÈRE${daySignals.length>1?'S':''}`;
  const scoreSignals = [
    { label: 'Nutrition', done: mealCoverage >= .67 },
    ...(nutritionTargetsReady ? [
      { label: 'Calories', done: nutritionProgress >= .7 },
      { label: 'Protéines', done: proteinProgress >= .7 },
    ] : []),
    { label: 'Activité', done: totalActiveMinutes >= 20 || todayWorkouts > 0 },
    { label: 'Hydratation', done: todayWaterMl >= waterGoal * .7 },
  ];
  const nextBestAction = !todayWeightLogged && latestWeight === null
    ? { label: 'Ajouter mon poids', detail: 'Crée ton premier repère de progression.', route: '/body?add=weight' }
    : todayPlannedMeals > 0
    ? { label: 'Voir mes repas planifiés', detail: `${todayPlannedMeals} repas planifié${todayPlannedMeals>1?'s':''} reste${todayPlannedMeals>1?'nt':''} à enregistrer aujourd’hui.`, route: '/meal-planner' }
    : !todayFoodCount
    ? { label: 'Enregistrer un repas', detail: 'Commence ton suivi nutritionnel du jour.', route: '/fuel' }
    : !hasPersonalTarget
      ? { label: 'Définir ma cible nutrition', detail: 'Ajoute ta cible dans Nutrition pour personnaliser le suivi calories et macros.', route: '/fuel' }
    : nutritionProgress < .7
      ? { label: 'Compléter ma nutrition', detail: effectiveTargetKcal ? `${Math.max(0, Math.round(effectiveTargetKcal-todayKcal))} kcal restent sur ta cible du jour.` : 'Ajoute ce que tu as mangé aujourd’hui.', route: '/fuel' }
      : proteinProgress < .7
        ? { label: 'Voir mes protéines', detail: targetProtein ? `${Math.max(0, Math.round(targetProtein-todayProtein))} g restent sur ta cible du jour.` : 'Vérifie ton apport en protéines.', route: '/fuel' }
        : totalActiveMinutes < 20 && todayWorkouts===0
          ? { label: 'Bouger aujourd’hui', detail: 'Ajoute une activité ou lance ta séance prévue.', route: '/activity' }
          : todayWaterMl < waterGoal*.7
            ? { label: 'Ajouter de l’eau', detail: `${Math.max(0, waterGoal-todayWaterMl)} ml avant ton objectif d’hydratation.`, route: '/fuel' }
            : { label: 'Journée bien suivie', detail: 'Tes principaux repères du jour sont enregistrés.', route: '/body' };
  const tomorrowSessionPlanned = Boolean(program?.program_json?.sessions?.some((session:any)=>{const tomorrowDay=days[tomorrowDate.getDay()];return session.day===tomorrowDay||(session.days&&session.days.includes(tomorrowDay));}));
  const automaticHabitDone:Record<string,boolean> = {
    nutrition: todayFoodCount > 0,
    activity: totalActiveMinutes >= 20 || todayWorkouts > 0,
    water: todayWaterMl >= waterGoal,
  };
  const habitDone:Record<string,boolean> = Object.fromEntries(habits.map(h => [h.id, automaticHabitDone[h.id] || Boolean(habitOverrides[h.id])]));
  const habitsDone = habits.filter(h => habitDone[h.id]).length;
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

            <NoxScore score={dailyScore} />
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


          <button onClick={()=>navigate(nextBestAction.route)} style={{...cardStyle,width:'100%',padding:16,marginBottom:14,textAlign:'left',cursor:'pointer',display:'flex',alignItems:'center',gap:13,color:TEXT}}>
            <span style={{width:42,height:42,borderRadius:14,background:ACCENT,display:'grid',placeItems:'center',flexShrink:0}}><ArrowRight size={19}/></span>
            <span style={{flex:1,minWidth:0}}><span style={{display:'block',fontSize:9.5,fontWeight:950,letterSpacing:'.11em',color:MUTED}}>PROCHAINE ACTION</span><span style={{display:'block',fontSize:14,fontWeight:950,marginTop:3}}>{nextBestAction.label}</span><span style={{display:'block',fontSize:10.5,color:MUTED,marginTop:3,lineHeight:1.4}}>{nextBestAction.detail}</span></span>
            <ChevronRight size={18}/>
          </button>

          <div style={{background:TEXT,color:'#fff',borderRadius:22,padding:18,marginBottom:14}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:16}}>
              <div><div style={{fontSize:10,fontWeight:950,letterSpacing:'.12em',color:ACCENT}}>NOX DAILY SCORE</div><div style={{fontSize:28,fontWeight:950,marginTop:5}}>{dailyScore}<span style={{fontSize:12,color:'#888'}}>/100</span></div></div>
              <div style={{fontSize:10,color:'#888',textAlign:'right',lineHeight:1.45}}>Régularité<br/>du jour</div>
            </div>
            <div style={{height:7,borderRadius:99,background:'#252525',overflow:'hidden',marginTop:13}}><div style={{height:'100%',width:dailyScore+'%',background:ACCENT,borderRadius:99}}/></div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:7,marginTop:12}}>
              <div style={{background:'#171717',borderRadius:12,padding:10}}><b>{todayFoodCount}</b><div style={{fontSize:8.5,color:'#888',marginTop:3}}>ENTRÉES NUTRITION</div></div>
              <div style={{background:'#171717',borderRadius:12,padding:10}}><b>{Math.round(totalActiveMinutes)} min</b><div style={{fontSize:8.5,color:'#888',marginTop:3}}>ACTIVITÉ</div></div>
              <div style={{background:'#171717',borderRadius:12,padding:10}}><b>{weekWorkouts}</b><div style={{fontSize:8.5,color:'#888',marginTop:3}}>SÉANCES 7J</div></div>
            </div>
            <div style={{display:'flex',gap:6,flexWrap:'wrap',marginTop:10}}>{scoreSignals.map(signal=><span key={signal.label} style={{fontSize:8.5,fontWeight:850,padding:'5px 7px',borderRadius:999,background:signal.done?'rgba(183,255,0,.14)':'#171717',color:signal.done?ACCENT:'#777'}}>{signal.done?'✓ ':''}{signal.label}</span>)}</div>
            <div style={{fontSize:9.5,color:'#777',lineHeight:1.45,marginTop:10}}>{dailyScoreLabel} · score personnel de régularité basé sur tes données enregistrées. Ce n’est pas un score médical.</div>
          </div>

          <div style={{...cardStyle,padding:18,marginBottom:14}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}}>
              <div><div style={{fontSize:10,fontWeight:900,letterSpacing:'.1em',color:MUTED}}>OBJECTIFS DU JOUR</div><div style={{fontSize:18,fontWeight:950,marginTop:4}}>TES HABITUDES</div></div>
              <div style={{fontSize:12,fontWeight:950,background:ACCENT,borderRadius:999,padding:'7px 10px'}}>{habitsDone}/{habits.length}</div>
            </div>
            <div style={{display:'grid',gap:7,marginTop:12}}>{habits.map(h=>{const automatic=automaticHabitDone[h.id];return <button key={h.id} onClick={()=>toggleHabit(h.id,automatic)} aria-pressed={habitDone[h.id]} style={{display:'flex',alignItems:'center',gap:10,background:SURFACE_2,border:'1px solid '+(habitDone[h.id]?'rgba(183,255,0,.35)':BORDER),borderRadius:13,padding:'11px 12px',textAlign:'left',cursor:automatic?'default':'pointer',color:TEXT}}><span style={{width:22,height:22,borderRadius:'50%',display:'grid',placeItems:'center',background:habitDone[h.id]?ACCENT:'#E2E2E2',fontSize:11,fontWeight:950,flexShrink:0}}>{habitDone[h.id]?'✓':''}</span><span style={{fontSize:11.5,fontWeight:850,flex:1}}>{h.label}</span><span style={{fontSize:8.5,color:MUTED,fontWeight:800}}>{automatic?'AUTO':habitDone[h.id]?'FAIT':'COCHER'}</span></button>})}</div>
          </div>

          {dayPeriod==='evening'&&<div style={{...cardStyle,padding:18,marginBottom:14}}>
            <div style={{fontSize:10,fontWeight:900,letterSpacing:'.1em',color:MUTED}}>DEMAIN</div>
            <div style={{fontSize:18,fontWeight:950,marginTop:4}}>PRÉPARE TA JOURNÉE</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:12}}>
              <button onClick={()=>navigate('/meal-planner')} style={{border:'1px solid '+BORDER,borderRadius:13,background:SURFACE_2,padding:12,textAlign:'left',cursor:'pointer'}}><Apple size={16}/><div style={{fontSize:11,fontWeight:900,marginTop:8}}>{tomorrowMealPlanned?'REPAS PLANIFIÉS':'PLANIFIER LES REPAS'}</div></button>
              <button onClick={()=>navigate('/program')} style={{border:'1px solid '+BORDER,borderRadius:13,background:SURFACE_2,padding:12,textAlign:'left',cursor:'pointer'}}><Dumbbell size={16}/><div style={{fontSize:11,fontWeight:900,marginTop:8}}>{tomorrowSessionPlanned?'SÉANCE PRÉVUE':'VOIR LE PLANNING'}</div></button>
            </div>
          </div>}

          <button onClick={()=>navigate('/fuel')} style={{...cardStyle,width:'100%',padding:18,marginBottom:14,textAlign:'left',cursor:'pointer',color:TEXT}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}}><div><div style={{fontSize:10,fontWeight:900,letterSpacing:'.1em',color:MUTED}}>NUTRITION AUJOURD'HUI</div><div style={{fontSize:20,fontWeight:950,marginTop:4}}>{Math.round(todayKcal)} <span style={{fontSize:12,color:MUTED}}>{effectiveTargetKcal ? `/ ${Math.round(effectiveTargetKcal)} kcal` : 'kcal enregistrées'}</span></div></div><ChevronRight size={18}/></div>
            <div style={{height:7,borderRadius:99,background:SURFACE_2,overflow:'hidden',marginTop:13}}><div style={{height:'100%',width:`${effectiveTargetKcal ? Math.min(100,(todayKcal/effectiveTargetKcal)*100) : 0}%`,background:ACCENT,borderRadius:99}}/></div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:7,marginTop:12}}>
              <div style={{background:SURFACE_2,borderRadius:12,padding:10}}><b>{Math.round(todayProtein)}g</b><div style={{fontSize:8.5,color:MUTED,marginTop:3}}>PROTÉINES</div></div>
              <div style={{background:SURFACE_2,borderRadius:12,padding:10}}><b>{Math.round(todayCarbs)}g</b><div style={{fontSize:8.5,color:MUTED,marginTop:3}}>GLUCIDES</div></div>
              <div style={{background:SURFACE_2,borderRadius:12,padding:10}}><b>{Math.round(todayFat)}g</b><div style={{fontSize:8.5,color:MUTED,marginTop:3}}>LIPIDES</div></div>
            </div>
            <div style={{fontSize:10.5,color:MUTED,marginTop:9}}>{hasPersonalTarget ? `${Math.round(remainingKcal || 0)} kcal restantes sur ton repère personnalisé` : 'Définis ta cible dans Nutrition pour afficher le restant de la journée'}</div>
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
              {[[todaySteps,'PAS'],[Math.round(totalActiveMinutes),'MIN'],[todayDistanceKm.toFixed(1),'KM'],[Math.round(totalActiveCalories),'KCAL']].map(([value,label])=><div key={String(label)} style={{background:SURFACE_2,borderRadius:12,padding:'10px 5px',textAlign:'center'}}><strong style={{fontSize:14}}>{value}</strong><div style={{fontSize:8,color:MUTED,marginTop:3}}>{label}</div></div>)}
            </div>
            <div style={{marginTop:11}}>
              <div style={{display:'flex',justifyContent:'space-between',gap:10,fontSize:9.5,color:MUTED}}><span>OBJECTIF PAS</span><span>{todaySteps.toLocaleString('fr-FR')} / {stepGoal.toLocaleString('fr-FR')}</span></div>
              <div style={{height:6,borderRadius:99,background:SURFACE_2,overflow:'hidden',marginTop:6}}><div style={{height:'100%',width:`${stepProgress*100}%`,background:ACCENT,borderRadius:99}}/></div>
            </div>
            {todayActivitySources.length>0&&<div style={{display:'flex',gap:6,flexWrap:'wrap',marginTop:11}}>{todayActivitySources.map(source=><span key={source} style={{background:SURFACE_2,borderRadius:9,padding:'6px 8px',fontSize:9,fontWeight:850,color:MUTED}}>{source==='machine_scan'?'SCAN MACHINE':source==='manual'?'MANUEL':String(source).replaceAll('_',' ').toUpperCase()}</span>)}</div>}
            {todayImportedCalories>0&&<div style={{fontSize:9.5,color:MUTED,lineHeight:1.4,marginTop:8}}>{Math.round(todayImportedCalories)} kcal proviennent de sources importées ou scannées. NOX conserve leur provenance pour éviter de les présenter comme une mesure directe.</div>}
          </div>

          <div style={{...cardStyle,width:'100%',boxSizing:'border-box',padding:18,marginBottom:14,color:TEXT}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
              <div><div style={{fontSize:10,fontWeight:900,letterSpacing:'.1em',color:MUTED}}>HYDRATATION</div><div style={{fontSize:19,fontWeight:950,marginTop:4}}>{Math.round(todayWaterMl)} <span style={{fontSize:12,color:MUTED}}>/ {waterGoal.toLocaleString('fr-FR')} ml</span></div></div>
              <button onClick={()=>navigate('/fasting')} aria-label="Ouvrir le suivi hydratation" style={{width:40,height:40,border:0,borderRadius:13,background:'#EEF5FF',color:'#4488ff',display:'grid',placeItems:'center',cursor:'pointer'}}><Droplets size={20}/></button>
            </div>
            <div style={{height:7,borderRadius:99,background:SURFACE_2,overflow:'hidden',marginTop:13}}><div style={{height:'100%',width:`${Math.min(100,(todayWaterMl/waterGoal)*100)}%`,background:'#4488ff',borderRadius:99}}/></div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:7,marginTop:11}}>
              {[150,250,500].map(ml=><button key={ml} onClick={()=>addWater(ml)} disabled={waterSaving} style={{padding:'9px 0',border:'1px solid #DCE8FF',borderRadius:10,background:'#F6F9FF',color:'#2F6FD0',fontSize:11,fontWeight:900,cursor:'pointer'}}>+{ml} ml</button>)}
              <button onClick={()=>updateWater(0)} disabled={waterSaving||todayWaterMl===0} style={{padding:'9px 0',border:'1px solid '+BORDER,borderRadius:10,background:'#fff',color:MUTED,fontSize:10,fontWeight:900,cursor:'pointer'}}>RESET</button>
            </div>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,marginTop:10,paddingTop:10,borderTop:'1px solid '+BORDER}}>
              <span style={{fontSize:9.5,color:MUTED,fontWeight:850}}>OBJECTIF PERSONNEL</span>
              <div style={{display:'flex',alignItems:'center',gap:6}}>
                <button onClick={()=>updateWaterGoal(waterGoal-250)} aria-label="Réduire l’objectif hydratation" style={{width:28,height:28,border:'1px solid '+BORDER,borderRadius:9,background:'#fff',fontWeight:950,cursor:'pointer'}}>−</button>
                <strong style={{minWidth:62,textAlign:'center',fontSize:10.5}}>{waterGoal.toLocaleString('fr-FR')} ml</strong>
                <button onClick={()=>updateWaterGoal(waterGoal+250)} aria-label="Augmenter l’objectif hydratation" style={{width:28,height:28,border:'1px solid '+BORDER,borderRadius:9,background:'#fff',fontWeight:950,cursor:'pointer'}}>+</button>
              </div>
            </div>
            {waterMessage&&<div style={{fontSize:9.5,color:MUTED,marginTop:8}}>{waterMessage}</div>}
          </div>

          <button onClick={()=>navigate('/recovery')} style={{...cardStyle,width:'100%',padding:18,marginBottom:14,textAlign:'left',cursor:'pointer',color:TEXT}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}><div><div style={{fontSize:10,fontWeight:900,letterSpacing:'.1em',color:MUTED}}>SOMMEIL & RÉCUPÉRATION</div><div style={{fontSize:19,fontWeight:950,marginTop:4}}>{freshSleepHours!==null?freshSleepHours.toFixed(1)+' h':'AUCUNE DONNÉE RÉCENTE'}</div></div><span style={{width:40,height:40,borderRadius:13,background:SURFACE_2,display:'grid',placeItems:'center'}}><MoonStar size={20}/></span></div>
            {freshSleepHours!==null?<><div style={{display:'flex',gap:7,marginTop:10,flexWrap:'wrap'}}>
              {latestSleepHrv!==null&&<span style={{background:SURFACE_2,borderRadius:9,padding:'6px 8px',fontSize:9.5,fontWeight:850}}>HRV {Math.round(latestSleepHrv)} ms</span>}
              {latestRestingHr!==null&&<span style={{background:SURFACE_2,borderRadius:9,padding:'6px 8px',fontSize:9.5,fontWeight:850}}>FC repos {Math.round(latestRestingHr)} bpm</span>}
            </div><div style={{fontSize:10.5,color:MUTED,marginTop:9}}>Dernières données disponibles · ouvre Récupération pour leur contexte. NOX ne les interprète pas comme un diagnostic médical.</div></>:<div style={{fontSize:10.5,color:MUTED,lineHeight:1.45,marginTop:9}}>Connecte une source compatible ou ajoute des données de récupération pour les retrouver ici. Aucune valeur n’est estimée quand la donnée manque.</div>}
          </button>

          <button onClick={()=>navigate('/meal-planner')} style={{...cardStyle,width:'100%',padding:18,marginBottom:14,textAlign:'left',cursor:'pointer',color:TEXT}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
              <div><div style={{fontSize:10,fontWeight:900,letterSpacing:'.1em',color:MUTED}}>DEMAIN · NUTRITION</div><div style={{fontSize:18,fontWeight:950,marginTop:4}}>{tomorrowMealPlanned?'REPAS DÉJÀ PLANIFIÉS':'PRÉPARE TA JOURNÉE'}</div></div>
              <ChevronRight size={18}/>
            </div>
            <div style={{fontSize:10.5,color:MUTED,lineHeight:1.45,marginTop:9}}>{tomorrowMealPlanned?`${tomorrowMealCount} repas planifié${tomorrowMealCount>1?'s':''} pour demain · ouvre le Meal Planner pour les modifier.`:'Planifie les repas de demain en quelques secondes depuis le Meal Planner.'}</div>
          </button>

          <div style={{...cardStyle,padding:18,marginBottom:14}}>
            <div style={{fontSize:10,fontWeight:900,letterSpacing:'.1em',color:MUTED}}>{briefLabel}</div>
            <div style={{fontSize:19,fontWeight:950,marginTop:5}}>{briefTitle}</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:7,marginTop:13}}>
              <div style={{background:SURFACE_2,borderRadius:13,padding:10}}><strong>{Math.round(todayKcal)}{effectiveTargetKcal ? ` / ${Math.round(effectiveTargetKcal)}` : ''}</strong><div style={{fontSize:9,color:MUTED,marginTop:3}}>KCAL</div></div>
              <div style={{background:SURFACE_2,borderRadius:13,padding:10}}><strong>{Math.round(todayProtein)}{targetProtein ? ` / ${Math.round(targetProtein)}` : ''}g</strong><div style={{fontSize:9,color:MUTED,marginTop:3}}>PROTÉINES</div></div>
              <div style={{background:SURFACE_2,borderRadius:13,padding:10}}><strong>{Math.round(totalActiveMinutes)}</strong><div style={{fontSize:9,color:MUTED,marginTop:3}}>MIN ACTIVES</div></div>
            </div>
            <div style={{fontSize:11.5,color:MUTED,lineHeight:1.5,marginTop:11}}>{briefInsight}</div>
            {dayPeriod==='evening'&&<div style={{marginTop:11,paddingTop:11,borderTop:'1px solid '+BORDER}}>
              <div style={{fontSize:9.5,fontWeight:900,letterSpacing:'.09em',color:MUTED}}>EVENING RECAP</div>
              <div style={{fontSize:12,fontWeight:850,marginTop:5}}>{consistencySignals}/5 repères de suivi renseignés</div>
              <div style={{fontSize:10.5,color:MUTED,lineHeight:1.45,marginTop:5}}>Repas : {todayMealCount} · Activité : {Math.round(totalActiveMinutes)} min · Eau : {Math.round(todayWaterMl)} ml · Séances : {todayWorkouts} · Poids {todayWeightLogged?'renseigné':'non renseigné'}.</div>
            </div>}
          </div>

          <button onClick={()=>navigate('/weekly-review')} style={{...cardStyle,width:'100%',padding:18,marginBottom:14,textAlign:'left',cursor:'pointer',color:TEXT}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}}>
              <div><div style={{fontSize:10,fontWeight:900,letterSpacing:'.1em',color:MUTED}}>TENDANCES · 7 JOURS</div><div style={{fontSize:18,fontWeight:950,marginTop:4}}>CE QUE TES DONNÉES MONTRENT</div></div><ChevronRight size={18}/>
            </div>
            <div style={{fontSize:11,color:MUTED,lineHeight:1.5,marginTop:9}}>{trendExplanation}</div>
            <div style={{fontSize:9.5,color:MUTED,lineHeight:1.45,marginTop:8}}>Une tendance décrit tes données enregistrées ; elle ne remplace pas les jours manquants et ne constitue pas une interprétation médicale.</div>
          </button>

          {todayActivitySources.includes('machine_scan')&&<div style={{...cardStyle,padding:14,marginBottom:14,fontSize:10.5,color:MUTED,lineHeight:1.45}}><strong style={{color:TEXT}}>Sources d’activité :</strong> NOX conserve la provenance des données scannées. Lors d’un prochain enregistrement, une activité de même type, durée et heure pourra être signalée comme doublon potentiel avant agrégation.</div>}

          {latestWeight!==null&&<button onClick={()=>navigate('/body')} style={{...cardStyle,width:'100%',padding:18,marginBottom:14,textAlign:'left',cursor:'pointer',color:TEXT}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}}><div><div style={{fontSize:10,fontWeight:900,letterSpacing:'.1em',color:MUTED}}>PROGRÈS PHYSIQUE</div><div style={{fontSize:20,fontWeight:950,marginTop:4}}>{latestWeight} <span style={{fontSize:12,color:MUTED}}>kg</span></div></div><ChevronRight size={18}/></div>
            <div style={{fontSize:10.5,color:MUTED,marginTop:9}}>{weightToGoal===null?'Dernier poids enregistré · ajoute un objectif dans Progrès pour suivre l’écart.':Math.abs(weightToGoal)<0.05?'Objectif de poids enregistré atteint.':`${Math.abs(weightToGoal).toFixed(1)} kg d’écart avec ton objectif actuel · suis la tendance dans Progrès.`}</div>
          </button>}

          <div style={{...cardStyle,padding:18,marginBottom:14}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}}>
              <div><div style={{fontSize:10,fontWeight:900,letterSpacing:'.1em',color:MUTED}}>OBJECTIFS DU JOUR</div><div style={{fontSize:18,fontWeight:950,marginTop:4}}>{habitsDone} / {habits.length} COMPLÉTÉS</div></div>
              <div style={{fontSize:11,fontWeight:900,color:MUTED}}>{Math.round((habitsDone/habits.length)*100)}%</div>
            </div>
            <div style={{height:7,borderRadius:99,background:SURFACE_2,overflow:'hidden',marginTop:12}}><div style={{height:'100%',width:`${(habitsDone/habits.length)*100}%`,background:ACCENT,borderRadius:99}}/></div>
            <div style={{marginTop:10}}>
              {habits.map(h=>{const automatic=automaticHabitDone[h.id];const done=habitDone[h.id];return <button key={h.id} onClick={()=>toggleHabit(h.id,automatic)} style={{width:'100%',display:'flex',alignItems:'center',gap:10,padding:'10px 0',border:0,borderTop:'1px solid '+BORDER,background:'transparent',textAlign:'left',cursor:automatic?'default':'pointer',color:TEXT}}><span style={{width:24,height:24,borderRadius:8,background:done?ACCENT:SURFACE_2,border:'1px solid '+(done?ACCENT:BORDER),display:'grid',placeItems:'center',fontSize:12,fontWeight:950}}>{done?'✓':''}</span><span style={{flex:1,fontSize:11.5,fontWeight:850}}>{h.label}</span><span style={{fontSize:9,color:MUTED}}>{automatic?'AUTO':done?'FAIT':'À FAIRE'}</span></button>})}
            </div>
            <div style={{fontSize:9.5,color:MUTED,lineHeight:1.45,marginTop:7}}>NOX valide automatiquement ce qu’il peut depuis tes données. Tu peux cocher manuellement le reste pour aujourd’hui.</div>
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
              detail={todayKcal ? (remainingKcal!==null ? `${Math.round(remainingKcal)} kcal restantes` : 'Cible à définir dans Nutrition') : 'Commence ton suivi nutrition'}
              onClick={() => navigate('/fuel')}
            />
            <MetricCard
              icon={Trophy}
              eyebrow="Progression"
              value={`${prCount} PR`}
              detail={`${xp} XP · régularité NOX`}
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
                  'radial-gradient(circle at 82% 35%, rgba(183,255,0,.16), transparent 24%), linear-gradient(135deg,#FFFFFF 0%,#FFFFFF 100%)',
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
                  color: '#4D6800',
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
                  Visualise une tendance indicative construite à partir de tes données enregistrées. Elle évolue avec ton suivi, reste incertaine et ne constitue jamais une date garantie.
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
