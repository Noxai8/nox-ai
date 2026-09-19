import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { BottomNav } from '../components/BottomNav';

const ACCENT = '#B7FF00';
const BG = '#F7F7F7';
const SURFACE = '#FFFFFF';
const BORDER = '#EAEAEA';

type Tab = 'progress' | 'activity' | 'photos';
type ActivityMode = 'manual' | 'confirm';

type ActivityForm = {
  activity_type: string;
  duration_minutes: string;
  calories_burned: string;
  distance_km: string;
  notes: string;
};

const EMPTY_ACTIVITY: ActivityForm = {
  activity_type: '',
  duration_minutes: '',
  calories_burned: '',
  distance_km: '',
  notes: '',
};

function normalizeActivityType(value: string): string {
  const raw = String(value || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const aliases: Array<[RegExp, string]> = [
    [/tapis|treadmill|course tapis/, 'treadmill'],
    [/velo|bike|cycling|cyclisme/, 'cycling'],
    [/rameur|rowing|rower/, 'rowing'],
    [/elliptique|elliptical/, 'elliptical'],
    [/stepper|stair|escalier/, 'stair_climber'],
    [/marche|walk/, 'walking'],
    [/course|running|run/, 'running'],
  ];
  return aliases.find(([pattern]) => pattern.test(raw))?.[1] || raw.replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'other';
}

function parseOptionalNumber(value: string): number | null {
  const raw = String(value || '').trim().replace(',', '.');
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseJsonObject(raw: string): any | null {
  const cleaned = String(raw || '')
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try { return JSON.parse(match[0]); } catch { return null; }
  }
}

export default function Body() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>('progress');
  const [logs, setLogs] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [foodEntries, setFoodEntries] = useState<any[]>([]);
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ weight: '', chest_cm: '', waist_cm: '', hips_cm: '', arms_cm: '', thighs_cm: '', notes: '' });
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<'7d' | '30d' | '90d' | '180d' | '365d' | 'all'>('30d');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [compareMeasurements, setCompareMeasurements] = useState(false);
  const [sevenDayAverage, setSevenDayAverage] = useState<number | null>(null);

  const [showActivity, setShowActivity] = useState(false);
  const [activityMode, setActivityMode] = useState<ActivityMode>('manual');
  const [activityForm, setActivityForm] = useState<ActivityForm>(EMPTY_ACTIVITY);
  const [activitySource, setActivitySource] = useState<'manual' | 'machine_scan'>('manual');
  const [activityExternalId, setActivityExternalId] = useState<string | null>(null);
  const [activityError, setActivityError] = useState('');
  const [activitySuccess, setActivitySuccess] = useState(false);
  const [activitySaving, setActivitySaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanPreview, setScanPreview] = useState<string | null>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (user) void load(); }, [user]);

  useEffect(() => {
    const add = searchParams.get('add');
    if (!add) return;

    if (add === 'weight' || add === 'measurement' || add === 'measurements') {
      setTab('progress');
      setShowAdd(true);
    } else if (add === 'activity') {
      setTab('activity');
      openManualActivity();
    } else if (add === 'scan') {
      navigate('/food-scan');
      return;
    } else if (add === 'photo' || add === 'photos') {
      setTab('photos');
    }

    const next = new URLSearchParams(searchParams);
    next.delete('add');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, navigate]);

  const load = async () => {
    if (!user) return;
    setLoading(true);

    const [bodyResult, activityResult, foodResult, workoutResult] = await Promise.all([
      supabase.from('body_logs').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('activity_logs').select('*').eq('user_id', user.id).order('performed_at', { ascending: false }).limit(200),
      supabase.from('food_entries').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(500),
      supabase.from('workouts').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(100),
    ]);

    if (bodyResult.error) {
      console.error('BODY_LOAD_ERROR', bodyResult.error);
      setSaveError(bodyResult.error.message);
    } else {
      setLogs(bodyResult.data || []);
      const recentWeights = (bodyResult.data || []).filter((l:any)=>Number(l.weight)>0 && new Date(l.created_at).getTime() >= Date.now()-7*86400000).map((l:any)=>Number(l.weight));
      setSevenDayAverage(recentWeights.length ? recentWeights.reduce((a:number,b:number)=>a+b,0)/recentWeights.length : null);
    }

    if (activityResult.error) {
      console.error('ACTIVITY_LOAD_ERROR', activityResult.error);
      setActivityError(
        activityResult.error.message.includes('activity_logs')
          ? "Le suivi d'activité n'est pas encore initialisé dans Supabase."
          : activityResult.error.message,
      );
    } else {
      setActivities(activityResult.data || []);
    }
    setFoodEntries(foodResult.data || []);
    setWorkouts(workoutResult.data || []);

    setLoading(false);
  };

  const save = async () => {
    if (!user || saving) return;
    setSaveError('');
    setSaveSuccess(false);

    const keys = ['weight', 'chest_cm', 'waist_cm', 'hips_cm', 'arms_cm', 'thighs_cm'] as const;
    if (!keys.some(key => form[key].trim() !== '')) {
      setSaveError('Ajoute au moins ton poids ou une mesure.');
      return;
    }

    const parsed: Record<string, number | null> = {};
    for (const key of keys) {
      const raw = form[key].trim().replace(',', '.');
      if (!raw) { parsed[key] = null; continue; }
      const value = Number(raw);
      if (!Number.isFinite(value) || value <= 0) {
        setSaveError('Vérifie les valeurs saisies : elles doivent être supérieures à 0.');
        return;
      }
      parsed[key] = value;
    }

    try {
      setSaving(true);
      const { error } = await supabase.from('body_logs').insert({
        user_id: user.id,
        weight: parsed.weight,
        chest_cm: parsed.chest_cm,
        waist_cm: parsed.waist_cm,
        hips_cm: parsed.hips_cm,
        arms_cm: parsed.arms_cm,
        thighs_cm: parsed.thighs_cm,
        notes: form.notes.trim() || null,
        created_at: new Date().toISOString(),
      });
      if (error) throw error;

      await load();
      setSaveSuccess(true);
      setForm({ weight: '', chest_cm: '', waist_cm: '', hips_cm: '', arms_cm: '', thighs_cm: '', notes: '' });
      window.setTimeout(() => {
        setShowAdd(false);
        setSaveSuccess(false);
      }, 650);
    } catch (error: any) {
      console.error('BODY_CHECKIN_SAVE_ERROR', error);
      setSaveError(error?.message || "Impossible d'enregistrer le check-in. Réessaie.");
    } finally {
      setSaving(false);
    }
  };

  const openManualActivity = () => {
    setActivityForm(EMPTY_ACTIVITY);
    setActivitySource('manual');
    setActivityExternalId(null);
    setActivityMode('manual');
    setActivityError('');
    setActivitySuccess(false);
    setScanPreview(null);
    setShowActivity(true);
  };

  const openScanActivity = () => navigate('/food-scan', { state: { scanMode: 'cardio' } });

  useEffect(() => {
    const scan = (location.state as any)?.machineScan;
    if (!scan) return;
    const activity = scan.activity || scan;
    setTab('activity');
    setActivityForm({
      activity_type: String(activity.activity_type || activity.type || activity.description || ''),
      duration_minutes: activity.duration_minutes != null ? String(activity.duration_minutes) : '',
      calories_burned: activity.calories_burned != null ? String(activity.calories_burned) : '',
      distance_km: activity.distance_km != null ? String(activity.distance_km) : '',
      notes: String(activity.notes || ''),
    });
    setActivitySource('machine_scan');
    setActivityExternalId(String(scan.external_id || scan.externalId || scan.source_record_id || scan.sourceRecordId || '').trim() || null);
    setActivityMode('confirm');
    setActivityError('');
    setActivitySuccess(false);
    setShowActivity(true);
    navigate(location.pathname + location.search, { replace: true, state: null });
  }, [location.state]);

  const validateActivity = () => {
    setActivityError('');
    const duration = parseOptionalNumber(activityForm.duration_minutes);
    const calories = parseOptionalNumber(activityForm.calories_burned);
    const distance = parseOptionalNumber(activityForm.distance_km);

    if (!activityForm.activity_type.trim()) {
      setActivityError("Indique le type d'activité.");
      return false;
    }
    if (duration === null || duration <= 0 || duration > 1440) {
      setActivityError('Entre une durée valide entre 1 et 1440 minutes.');
      return false;
    }
    if (calories !== null && (calories < 0 || calories > 10000)) {
      setActivityError('Vérifie les calories affichées.');
      return false;
    }
    if (distance !== null && (distance < 0 || distance > 1000)) {
      setActivityError('Vérifie la distance affichée.');
      return false;
    }
    return true;
  };

  const saveActivity = async () => {
    if (!user || activitySaving || !validateActivity()) return;

    const duration = parseOptionalNumber(activityForm.duration_minutes)!;
    const calories = parseOptionalNumber(activityForm.calories_burned);
    const distance = parseOptionalNumber(activityForm.distance_km);

    try {
      setActivitySaving(true);
      setActivityError('');

      // NOX Health Engine · première couche anti-doublon.
      // Elle s'applique à toute nouvelle activité, quelle que soit sa source
      // (manuel, machine_scan, puis imports Connect), afin d'éviter de compter
      // deux fois une même séance provenant de plusieurs appareils.
      const normalizedType = normalizeActivityType(activityForm.activity_type);
      const candidateTime = Date.now();
      const duplicate = activities.find((item: any) => {
        const itemTime = new Date(item.performed_at || item.created_at).getTime();
        if (!Number.isFinite(itemTime)) return false;

        const timeDelta = Math.abs(candidateTime - itemTime);
        const sameExternalId = Boolean(activityExternalId && String(item.external_id || item.source_record_id || '').trim() === activityExternalId);
        if (sameExternalId) return true;
        const sameType = normalizeActivityType(String(item.activity_type || '')) === normalizedType;
        const itemDuration = Number(item.duration_minutes || 0);
        const sameDuration = Math.abs(itemDuration - Math.round(duration)) <= Math.max(2, Math.round(duration * 0.08));
        const sameDistance = distance === null || item.distance_km == null || Math.abs(Number(item.distance_km) - distance) <= Math.max(0.2, distance * 0.05);
        const sameCalories = calories === null || item.calories_burned == null || Math.abs(Number(item.calories_burned) - calories) <= Math.max(25, calories * 0.12);

        // Fenêtre serrée si le type correspond ; fenêtre plus large uniquement
        // lorsque durée + distance/calories rendent la session très similaire.
        const strongMatch = sameType && sameDuration && sameDistance && sameCalories;
        const likelyCrossSourceMatch = sameDuration && sameDistance && sameCalories;
        return (strongMatch && timeDelta <= 30 * 60 * 1000) ||
          (likelyCrossSourceMatch && timeDelta <= 10 * 60 * 1000);
      });

      if (duplicate) {
        const existingSource = String(duplicate.source || 'activité existante').replaceAll('_', ' ');
        setActivityError(`Doublon probable : une séance très similaire existe déjà (${existingSource}). NOX ne l’ajoute pas une seconde fois.`);
        return;
      }

      const { error } = await supabase.from('activity_logs').insert({
        user_id: user.id,
        activity_type: normalizedType,
        duration_minutes: Math.round(duration),
        calories_burned: calories === null ? null : Math.round(calories),
        distance_km: distance,
        source: activitySource,
        notes: activityForm.notes.trim() || null,
        performed_at: new Date().toISOString(),
      });

      if (error) throw error;

      await load();
      setActivitySuccess(true);
      window.setTimeout(() => {
        setShowActivity(false);
        setActivitySuccess(false);
        setActivityForm(EMPTY_ACTIVITY);
        setScanPreview(previous => {
          if (previous?.startsWith('blob:')) URL.revokeObjectURL(previous);
          return null;
        });
      }, 650);
    } catch (error: any) {
      console.error('ACTIVITY_SAVE_ERROR', error);
      setActivityError(error?.message || "Impossible d'enregistrer l'activité.");
    } finally {
      setActivitySaving(false);
    }
  };

  const deleteActivity = async (id: string) => {
    if (!user) return;
    setActivityError('');
    const { error } = await supabase.from('activity_logs').delete().eq('id', id).eq('user_id', user.id);
    if (error) {
      setActivityError(error.message);
      return;
    }
    await load();
  };

  const getRangeData = () => {
    const now = Date.now();
    if (range === 'all') return [...logs].reverse();
    const days = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : range === '180d' ? 180 : 365;
    const cutoff = now - days * 24 * 60 * 60 * 1000;
    return logs.filter(l => new Date(l.created_at).getTime() > cutoff).reverse();
  };

  const rangeData = getRangeData();
  const weightLogs = rangeData.filter(l => l.weight);
  const latest = logs.find(l => l.weight);
  const oldest = weightLogs[0];
  const delta = latest && oldest && latest.id !== oldest.id ? (latest.weight - oldest.weight).toFixed(1) : null;

  const todayKey = new Date().toLocaleDateString('en-CA');
  const todayActivities = activities.filter(activity =>
    new Date(activity.performed_at).toLocaleDateString('en-CA') === todayKey,
  );
  const todayCalories = todayActivities.reduce((sum, activity) => sum + (Number(activity.calories_burned) || 0), 0);
  const todayMinutes = todayActivities.reduce((sum, activity) => sum + (Number(activity.duration_minutes) || 0), 0);
  const rangeDays = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : range === '180d' ? 180 : range === '365d' ? 365 : null;
  const rangeCutoff = rangeDays ? Date.now() - rangeDays * 86400000 : 0;
  const inRange = (value: any) => !rangeDays || new Date(value).getTime() >= rangeCutoff;
  const rangeFoods = foodEntries.filter(e => inRange(e.created_at));
  const rangeActivities = activities.filter(a => inRange(a.performed_at || a.created_at));
  const rangeWorkouts = workouts.filter(w => inRange(w.completed_at || w.created_at) && (w.status === 'completed' || w.completed_at));
  const trackedDays = new Set(rangeFoods.map(e => new Date(e.created_at).toLocaleDateString('en-CA'))).size || 1;
  const avgCalories = Math.round(rangeFoods.reduce((s,e)=>s+Number(e.calories||e.kcal||0),0) / trackedDays);
  const avgProtein = Math.round(rangeFoods.reduce((s,e)=>s+Number(e.protein||0),0) / trackedDays);
  const activeMinutesRange = Math.round(rangeActivities.reduce((s,a)=>s+Number(a.duration_minutes||0),0));
  const rangeWeightLogs = rangeData.filter(l => Number(l.weight) > 0);
  const measurementLogs = rangeData.filter(l => l.waist_cm || l.chest_cm || l.hips_cm || l.arms_cm || l.thighs_cm);
  const measurementDelta = (key: string) => {
    const points = measurementLogs.filter(l => Number(l[key]) > 0);
    if (points.length < 2) return null;
    return Number(points[points.length - 1][key]) - Number(points[0][key]);
  };
  const measurementCards = [
    ['Taille', 'waist_cm'], ['Poitrine', 'chest_cm'], ['Hanches', 'hips_cm'], ['Bras', 'arms_cm'], ['Cuisses', 'thighs_cm'],
  ].map(([label,key]) => {
    const current = measurementLogs.filter(l => Number(l[key]) > 0).at(-1);
    return { label, key, value: current ? Number(current[key]) : null, delta: measurementDelta(key) };
  });
  const firstRangeWeight = rangeWeightLogs[0]?.weight ? Number(rangeWeightLogs[0].weight) : null;
  const latestRangeWeight = rangeWeightLogs.length ? Number(rangeWeightLogs[rangeWeightLogs.length - 1].weight) : null;
  const weightChange = firstRangeWeight !== null && latestRangeWeight !== null ? latestRangeWeight - firstRangeWeight : null;
  const previousWeight = rangeWeightLogs.length > 1 ? Number(rangeWeightLogs[rangeWeightLogs.length - 2].weight) : null;
  const recentWeightChange = previousWeight !== null && latestRangeWeight !== null ? latestRangeWeight - previousWeight : null;
  const avgActiveMinutesPerDay = rangeDays ? Math.round(activeMinutesRange / Math.max(1, rangeDays)) : null;
  const weeklyWindow = Date.now() - 7 * 86400000;
  const weeklyFoods = foodEntries.filter(e => new Date(e.created_at).getTime() >= weeklyWindow);
  const weeklyActivities = activities.filter(a => new Date(a.performed_at || a.created_at).getTime() >= weeklyWindow);
  const weeklyWorkouts = workouts.filter(w => new Date(w.completed_at || w.created_at).getTime() >= weeklyWindow && (w.status === 'completed' || w.completed_at));
  const weeklyNutritionDays = new Set(weeklyFoods.map(e => new Date(e.created_at).toLocaleDateString('en-CA'))).size;
  const weeklyMinutes = Math.round(weeklyActivities.reduce((s,a)=>s+Number(a.duration_minutes||0),0));
  const weeklyReportReady = weeklyNutritionDays > 0 || weeklyActivities.length > 0 || weeklyWorkouts.length > 0 || sevenDayAverage !== null;
  const monthlyWindow = Date.now() - 30 * 86400000;
  const monthlyFoods = foodEntries.filter(e => new Date(e.created_at).getTime() >= monthlyWindow);
  const monthlyActivities = activities.filter(a => new Date(a.performed_at || a.created_at).getTime() >= monthlyWindow);
  const monthlyWorkouts = workouts.filter(w => new Date(w.completed_at || w.created_at).getTime() >= monthlyWindow && (w.status === 'completed' || w.completed_at));
  const monthlyNutritionDays = new Set(monthlyFoods.map(e => new Date(e.created_at).toLocaleDateString('en-CA'))).size;
  const monthlyMinutes = Math.round(monthlyActivities.reduce((s,a)=>s+Number(a.duration_minutes||0),0));
  const monthlyWeights = logs.filter(l => Number(l.weight)>0 && new Date(l.created_at).getTime() >= monthlyWindow).reverse();
  const monthlyWeightChange = monthlyWeights.length > 1 ? Number(monthlyWeights.at(-1).weight) - Number(monthlyWeights[0].weight) : null;
  const timeline = [
    ...logs.map((item:any)=>({type:'body',date:item.created_at,title:item.weight?\`Poids · \${Number(item.weight).toFixed(1)} kg\`:'Mensurations',detail:[item.waist_cm&&\`Taille \${item.waist_cm} cm\`,item.chest_cm&&\`Poitrine \${item.chest_cm} cm\`].filter(Boolean).join(' · ')})),
    ...activities.map((item:any)=>({type:'activity',date:item.performed_at||item.created_at,title:String(item.activity_type||'Activité').replaceAll('_',' '),detail:\`\${Math.round(Number(item.duration_minutes||0))} min\${item.distance_km?\` · \${Number(item.distance_km).toFixed(1)} km\`:''}\`})),
    ...workouts.filter((item:any)=>item.status==='completed'||item.completed_at).map((item:any)=>({type:'training',date:item.completed_at||item.created_at,title:'Séance Training terminée',detail:item.name||item.workout_name||''})),
  ].filter(item=>item.date).sort((a,b)=>new Date(b.date).getTime()-new Date(a.date).getTime()).slice(0,12);
  const rangeActivityDays = new Set(rangeActivities.map(a=>new Date(a.performed_at||a.created_at).toLocaleDateString('en-CA'))).size || 1;
  const avgActivityCalories = Math.round(rangeActivities.reduce((s,a)=>s+Number(a.calories_burned||0),0)/rangeActivityDays);
  const avgActivityMinutes = Math.round(activeMinutesRange/rangeActivityDays);
  const workoutsPerWeek = rangeDays ? Number((rangeWorkouts.length/(rangeDays/7)).toFixed(1)) : null;
  const progressSummary = [
    weightChange === null ? null : `Poids : ${weightChange > 0 ? '+' : ''}${weightChange.toFixed(1)} kg sur la période.`,
    rangeFoods.length ? `Nutrition suivie sur ${trackedDays} jour(s), moyenne ${avgCalories} kcal et ${avgProtein} g de protéines par jour.` : null,
    rangeActivities.length ? `Activité : ${activeMinutesRange} minutes enregistrées${avgActiveMinutesPerDay !== null ? `, soit environ ${avgActiveMinutesPerDay} min/j` : ''}.` : null,
    rangeWorkouts.length ? `Training : ${rangeWorkouts.length} séance(s) terminée(s).` : null,
  ].filter(Boolean) as string[];


  const MiniChart = () => {
    if (weightLogs.length < 2) return null;
    const weights = weightLogs.map(l => l.weight);
    const min = Math.min(...weights) - 1;
    const max = Math.max(...weights) + 1;
    const W = 300, H = 80;
    const points = weightLogs.map((l, i) => {
      const x = (i / (weightLogs.length - 1)) * W;
      const y = H - ((l.weight - min) / (max - min)) * H;
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 80 }}>
        <polyline points={points} fill="none" stroke={ACCENT} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {weightLogs.map((l, i) => {
          const x = (i / (weightLogs.length - 1)) * W;
          const y = H - ((l.weight - min) / (max - min)) * H;
          return <circle key={i} cx={x} cy={y} r="3" fill={ACCENT} />;
        })}
      </svg>
    );
  };

  const activityInput = (key: keyof ActivityForm, label: string, unit?: string, placeholder = '') => (
    <label style={{ display: 'block', background: '#F7F7F7', border: `1px solid ${BORDER}`, borderRadius: 14, padding: 12 }}>
      <div style={{ fontSize: 9.5, color: '#777', fontWeight: 850, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', marginTop: 5 }}>
        <input
          value={activityForm[key]}
          onChange={e => setActivityForm(p => ({ ...p, [key]: e.target.value }))}
          placeholder={placeholder}
          type={key === 'activity_type' || key === 'notes' ? 'text' : 'number'}
          inputMode={key === 'activity_type' || key === 'notes' ? undefined : 'decimal'}
          style={{ width: '100%', minWidth: 0, border: 0, outline: 0, background: 'transparent', color: '#0A0A0A', fontSize: 16, fontWeight: 850 }}
        />
        {unit && <span style={{ color: '#555', fontSize: 10 }}>{unit}</span>}
      </div>
    </label>
  );

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: BG, display: 'grid', placeItems: 'center' }}>
        <div style={{ color: ACCENT, fontWeight: 900, letterSpacing: '.14em' }}>NOX · PROGRÈS</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: BG, color: '#0A0A0A', paddingBottom: 100 }}>
      <main style={{ width: '100%', maxWidth: 560, margin: '0 auto' }}>
        <header style={{ padding: '24px 20px 18px', background: '#F7F7F7', borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
            <div>
              <div style={{ fontSize: 10, color: '#777', fontWeight: 850, textTransform: 'uppercase', letterSpacing: '.14em' }}>Tout ton progrès. Un seul endroit.</div>
              <div style={{ fontSize: 31, fontWeight: 950, letterSpacing: '-.05em', marginTop: 4 }}>PROGRÈS</div>
            </div>
            <button onClick={() => setShowAdd(true)} style={{ border: 0, borderRadius: 13, background: ACCENT, color: '#050505', padding: '11px 15px', fontSize: 11, fontWeight: 950, letterSpacing: '.04em', cursor: 'pointer' }}>+ CHECK-IN</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', background: '#ECECEC', padding: 4, borderRadius: 14, marginTop: 20 }}>
            {([
              ['progress', 'PROGRESSION'],
              ['activity', 'ACTIVITÉ'],
              ['photos', 'PHOTOS'],
            ] as [Tab, string][]).map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)} style={{
                border: 0, borderRadius: 11, padding: '10px 3px', cursor: 'pointer',
                background: tab === id ? '#0A0A0A' : 'transparent',
                color: tab === id ? '#fff' : '#777', fontSize: 9.5, fontWeight: 900, letterSpacing: '.035em'
              }}>{label}</button>
            ))}
          </div>
        </header>

        <section style={{ padding: 20 }}>
          {tab === 'progress' && (
            <>
              {latest ? (
                <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 22, padding: 20, marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 18, alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: 10, color: '#777', fontWeight: 850, letterSpacing: '.09em' }}>POIDS ACTUEL</div>
                      <div style={{ fontSize: 42, fontWeight: 950, letterSpacing: '-.055em', lineHeight: 1.05, marginTop: 6 }}>
                        {latest.weight}<span style={{ fontSize: 15, color: '#777', marginLeft: 5 }}>kg</span>
                      </div>
                    </div>
                    {delta !== null && (
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 9.5, color: '#666', fontWeight: 850, letterSpacing: '.08em' }}>ÉVOLUTION</div>
                        <div style={{ marginTop: 6, fontSize: 20, fontWeight: 950, color: parseFloat(delta) <= 0 ? ACCENT : '#ff785f' }}>
                          {parseFloat(delta) > 0 ? '+' : ''}{delta} kg
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 6, margin: '22px 0 15px' }}>
                    {(['7d', '30d', '90d', '180d', '365d', 'all'] as const).map(r => (
                      <button key={r} onClick={() => setRange(r)} style={{
                        flex: 1, borderRadius: 9, padding: '7px 0', cursor: 'pointer',
                        border: `1px solid ${range === r ? 'rgba(183,255,0,.28)' : BORDER}`,
                        background: range === r ? 'rgba(183,255,0,.08)' : '#0c0c0c',
                        color: range === r ? ACCENT : '#666', fontSize: 10.5, fontWeight: 850
                      }} >{{'7d':'7J','30d':'1M','90d':'3M','180d':'6M','365d':'1A','all':'Tout'}[r]}</button>
                    ))}
                  </div>

                  <div style={{ borderRadius: 15, padding: '12px 10px 4px', background: '#F7F7F7', border: '1px solid #EAEAEA' }}>
                    {weightLogs.length >= 2 ? (
                      <>
                        <div style={{fontSize:10.5,color:'#777',marginBottom:10}}>Moyenne 7 jours · <strong style={{color:'#0A0A0A'}}>{sevenDayAverage !== null ? sevenDayAverage.toFixed(1)+' kg' : '—'}</strong></div>
                        <MiniChart />
                      </>
                    ) : (
                      <div style={{ height: 80, display: 'grid', placeItems: 'center', color: '#555', fontSize: 11.5 }}>Encore un check-in pour afficher ta courbe</div>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ borderRadius: 22, border: `1px solid ${BORDER}`, background: SURFACE, padding: '42px 22px', textAlign: 'center', marginBottom: 14 }}>
                  <div style={{ width: 52, height: 52, margin: '0 auto 16px', borderRadius: 16, background: 'rgba(183,255,0,.08)', border: '1px solid rgba(183,255,0,.16)', display: 'grid', placeItems: 'center', color: ACCENT, fontSize: 22 }}>+</div>
                  <div style={{ fontSize: 18, fontWeight: 950 }}>COMMENCE TON SUIVI</div>
                  <div style={{ color: '#777', fontSize: 12.5, lineHeight: 1.55, margin: '8px auto 18px', maxWidth: 300 }}>Ajoute ton premier check-in pour construire ta courbe de progression.</div>
                  <button onClick={() => setShowAdd(true)} style={{ border: 0, borderRadius: 12, background: ACCENT, color: '#050505', padding: '12px 17px', fontWeight: 950, cursor: 'pointer' }}>AJOUTER MON POIDS</button>
                </div>
              )}

              {logs.filter(l => l.weight).length > 0 && (
                <>
                  <div style={{ fontSize: 10.5, color: '#777', fontWeight: 900, letterSpacing: '.09em', margin: '21px 2px 10px' }}>HISTORIQUE</div>
                  {logs.filter(l => l.weight).slice(0, 10).map(log => (
                    <div key={log.id} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 15, padding: '14px 15px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 18, fontWeight: 950 }}>{log.weight} <span style={{ fontSize: 11, color: '#666' }}>kg</span></div>
                        <div style={{ fontSize: 10.5, color: '#666', marginTop: 4 }}>{new Date(log.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                      </div>
                      {log.notes && <div style={{ fontSize: 11, color: '#777', maxWidth: 150, textAlign: 'right', lineHeight: 1.4 }}>{log.notes}</div>}
                    </div>
                  ))}
                </>
              )}

              <div style={{ fontSize: 10.5, color: '#777', fontWeight: 900, letterSpacing: '.09em', margin: '22px 2px 10px' }}>VUE D'ENSEMBLE</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:10, marginBottom:18 }}>
                {[
                  ['Nutrition', rangeFoods.length ? avgCalories + ' kcal/j' : '—', rangeFoods.length ? avgProtein + ' g protéines/j' : 'Aucune donnée'],
                  ['Activité', rangeActivities.length ? activeMinutesRange + ' min' : '—', rangeActivities.length + ' activité(s)'],
                  ['Training', rangeWorkouts.length ? String(rangeWorkouts.length) : '—', 'séance(s) terminée(s)'],
                  ['Suivi', String(rangeData.length), 'check-in(s) corps'],
                ].map(([label,value,detail]) => (
                  <div key={label} style={{ background:'#fff', border:`1px solid ${BORDER}`, borderRadius:18, padding:16 }}>
                    <div style={{ fontSize:9.5, color:'#777', fontWeight:900, letterSpacing:'.08em', textTransform:'uppercase' }}>{label}</div>
                    <div style={{ fontSize:21, fontWeight:950, marginTop:8, letterSpacing:'-.03em' }}>{value}</div>
                    <div style={{ fontSize:10.5, color:'#777', marginTop:4 }}>{detail}</div>
                  </div>
                ))}
              </div>

              <div style={{ fontSize: 10.5, color: '#777', fontWeight: 900, letterSpacing: '.09em', margin: '22px 2px 10px' }}>SYNTHÈSE NOX</div>
              <div style={{ background:'#0A0A0A', color:'#fff', borderRadius:22, padding:19, marginBottom:18 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
                  <div>
                    <div style={{ fontSize:10, color:ACCENT, fontWeight:950, letterSpacing:'.11em' }}>TA PÉRIODE</div>
                    <div style={{ fontSize:20, fontWeight:950, marginTop:5 }}>CE QUE TES DONNÉES MONTRENT</div>
                  </div>
                  {recentWeightChange !== null && <div style={{ background:ACCENT, color:'#050505', borderRadius:12, padding:'8px 10px', fontWeight:950, fontSize:12 }}>{recentWeightChange > 0 ? '+' : ''}{recentWeightChange.toFixed(1)} kg</div>}
                </div>
                {progressSummary.length ? (
                  <div style={{ display:'grid', gap:9, marginTop:16 }}>
                    {progressSummary.map((line,i)=><div key={i} style={{ background:'#171717', border:'1px solid #242424', borderRadius:13, padding:'11px 12px', color:'#D7D7D7', fontSize:11.5, lineHeight:1.45 }}>{line}</div>)}
                  </div>
                ) : (
                  <div style={{ color:'#888', fontSize:12, lineHeight:1.5, marginTop:14 }}>Continue à enregistrer ton poids, tes repas, tes activités et tes séances pour construire ta synthèse.</div>
                )}
                <div style={{ color:'#777', fontSize:9.5, lineHeight:1.45, marginTop:13 }}>Synthèse descriptive basée uniquement sur tes données enregistrées dans NOX. Les tendances ne garantissent pas un résultat futur.</div>
              </div>

              <div style={{ fontSize: 10.5, color: '#777', fontWeight: 900, letterSpacing: '.09em', margin: '22px 2px 10px' }}>WEEKLY REVIEW</div>
              <div style={{ background:'#fff', border:`1px solid ${BORDER}`, borderRadius:20, padding:17, marginBottom:18 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12 }}>
                  <div>
                    <div style={{ fontSize:17, fontWeight:950 }}>TES 7 DERNIERS JOURS</div>
                    <div style={{ fontSize:11, color:'#777', marginTop:4 }}>Nutrition · activité · training · poids</div>
                  </div>
                  <div style={{ width:10, height:10, borderRadius:999, background:weeklyReportReady?ACCENT:'#DDD', marginTop:5 }} />
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:8, marginTop:14 }}>
                  <div style={{background:'#F7F7F7',borderRadius:13,padding:11}}><div style={{fontSize:9,color:'#888'}}>NUTRITION</div><strong>{weeklyNutritionDays} j suivis</strong></div>
                  <div style={{background:'#F7F7F7',borderRadius:13,padding:11}}><div style={{fontSize:9,color:'#888'}}>ACTIVITÉ</div><strong>{weeklyMinutes} min</strong></div>
                  <div style={{background:'#F7F7F7',borderRadius:13,padding:11}}><div style={{fontSize:9,color:'#888'}}>TRAINING</div><strong>{weeklyWorkouts.length} séance(s)</strong></div>
                  <div style={{background:'#F7F7F7',borderRadius:13,padding:11}}><div style={{fontSize:9,color:'#888'}}>POIDS MOY. 7J</div><strong>{sevenDayAverage !== null ? sevenDayAverage.toFixed(1)+' kg' : '—'}</strong></div>
                </div>
                <button onClick={()=>navigate('/weekly-review')} style={{width:'100%',border:0,borderRadius:13,background:'#0A0A0A',color:'#fff',padding:13,marginTop:12,fontSize:11,fontWeight:950,cursor:'pointer'}}>OUVRIR LE WEEKLY REVIEW</button>
              </div>

              <div style={{ fontSize: 10.5, color: '#777', fontWeight: 900, letterSpacing: '.09em', margin: '22px 2px 10px' }}>RAPPORT 30 JOURS</div>
              <div style={{ background:'#0A0A0A', color:'#fff', borderRadius:20, padding:17, marginBottom:18 }}>
                <div style={{fontSize:10,color:ACCENT,fontWeight:950,letterSpacing:'.1em'}}>NOX MONTHLY</div>
                <div style={{fontSize:18,fontWeight:950,marginTop:4}}>TON MOIS EN UN COUP D'ŒIL</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:8,marginTop:14}}>
                  <div style={{background:'#171717',borderRadius:13,padding:11}}><div style={{fontSize:9,color:'#888'}}>NUTRITION</div><strong>{monthlyNutritionDays} j suivis</strong></div>
                  <div style={{background:'#171717',borderRadius:13,padding:11}}><div style={{fontSize:9,color:'#888'}}>ACTIVITÉ</div><strong>{monthlyMinutes} min</strong></div>
                  <div style={{background:'#171717',borderRadius:13,padding:11}}><div style={{fontSize:9,color:'#888'}}>TRAINING</div><strong>{monthlyWorkouts.length} séance(s)</strong></div>
                  <div style={{background:'#171717',borderRadius:13,padding:11}}><div style={{fontSize:9,color:'#888'}}>POIDS</div><strong>{monthlyWeightChange !== null ? (monthlyWeightChange>0?'+':'')+monthlyWeightChange.toFixed(1)+' kg' : '—'}</strong></div>
                </div>
                <div style={{fontSize:9.5,color:'#777',lineHeight:1.45,marginTop:12}}>Résumé descriptif des 30 derniers jours à partir des données enregistrées dans NOX.</div>
              </div>

              <div style={{ fontSize:10.5,color:'#777',fontWeight:900,letterSpacing:'.09em',margin:'22px 2px 10px' }}>TIMELINE NOX</div>
              <div style={{background:'#fff',border:\`1px solid \${BORDER}\`,borderRadius:20,padding:'4px 15px',marginBottom:18}}>
                {timeline.length===0?<div style={{padding:'22px 4px',fontSize:12,color:'#777'}}>Ta timeline se construira avec tes check-ins, activités et entraînements.</div>:timeline.map((item:any,i:number)=><div key={item.type+item.date+i} style={{display:'grid',gridTemplateColumns:'12px 1fr',gap:11,padding:'13px 0',borderBottom:i<timeline.length-1?\`1px solid \${BORDER}\`:'none'}}>
                  <span style={{width:9,height:9,borderRadius:'50%',background:item.type==='body'?ACCENT:'#0A0A0A',marginTop:4}}/>
                  <div><div style={{fontSize:12.5,fontWeight:900,textTransform:'capitalize'}}>{item.title}</div>{item.detail&&<div style={{fontSize:10.5,color:'#777',marginTop:3}}>{item.detail}</div>}<div style={{fontSize:9.5,color:'#999',marginTop:4}}>{new Date(item.date).toLocaleDateString('fr-FR',{day:'2-digit',month:'short',year:'numeric'})}</div></div>
                </div>)}
              </div>

              <div style={{ fontSize:10.5,color:'#777',fontWeight:900,letterSpacing:'.09em',margin:'22px 2px 10px' }}>MOYENNES DE LA PÉRIODE</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:10,marginBottom:18}}>
                {[
                  ['Nutrition',rangeFoods.length?\`\${avgCalories} kcal/j · \${avgProtein} g prot.\`:'—'],
                  ['Activité',rangeActivities.length?\`\${avgActivityMinutes} min/j · \${avgActivityCalories} kcal/j\`:'—'],
                  ['Training',rangeWorkouts.length?\`\${rangeWorkouts.length} séances\${workoutsPerWeek!==null?\` · \${workoutsPerWeek}/sem.\`:''}\`:'—'],
                  ['Suivi',\`\${trackedDays} jour(s) nutrition\`],
                ].map(([label,value])=><div key={label} style={{background:'#fff',border:\`1px solid \${BORDER}\`,borderRadius:16,padding:14}}><div style={{fontSize:9,color:'#777',fontWeight:900,letterSpacing:'.07em'}}>{label.toUpperCase()}</div><div style={{fontSize:13,fontWeight:900,marginTop:7,lineHeight:1.35}}>{value}</div></div>)}
              </div>

              <div style={{ fontSize: 10.5, color: '#777', fontWeight: 900, letterSpacing: '.09em', margin: '22px 2px 10px' }}>ÉVOLUTION DES MENSURATIONS</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:10, marginBottom:18 }}>
                {measurementCards.map(item => (
                  <div key={item.key} style={{ background:'#fff', border:`1px solid ${BORDER}`, borderRadius:18, padding:15 }}>
                    <div style={{ fontSize:9.5, color:'#777', fontWeight:900, textTransform:'uppercase', letterSpacing:'.07em' }}>{item.label}</div>
                    <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', gap:8, marginTop:8 }}>
                      <div style={{ fontSize:21, fontWeight:950 }}>{item.value !== null ? item.value.toFixed(1) : '—'}{item.value !== null && <span style={{ fontSize:10, color:'#777', marginLeft:3 }}>cm</span>}</div>
                      {item.delta !== null && <div style={{ fontSize:11, fontWeight:900, color:'#0A0A0A', background:ACCENT, borderRadius:999, padding:'5px 7px' }}>{item.delta > 0 ? '+' : ''}{item.delta.toFixed(1)}</div>}
                    </div>
                  </div>
                ))}
              </div>

              {measurementLogs.length >= 2 && (
                <div style={{ background:'#fff', border:`1px solid ${BORDER}`, borderRadius:20, padding:16, marginBottom:18 }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
                    <div>
                      <div style={{ fontSize:10, color:'#777', fontWeight:900, letterSpacing:'.08em' }}>COMPARATEUR</div>
                      <div style={{ fontSize:16, fontWeight:950, marginTop:4 }}>DÉBUT ↔ AUJOURD'HUI</div>
                    </div>
                    <button onClick={()=>setCompareMeasurements(v=>!v)} style={{ border:0, borderRadius:12, background:compareMeasurements?'#0A0A0A':ACCENT, color:compareMeasurements?'#fff':'#050505', padding:'9px 11px', fontSize:10, fontWeight:950, cursor:'pointer' }}>{compareMeasurements?'FERMER':'COMPARER'}</button>
                  </div>
                  {compareMeasurements && (
                    <div style={{ display:'grid', gap:8, marginTop:14 }}>
                      {measurementCards.filter(item=>item.value !== null && item.delta !== null).map(item=>{
                        const start = item.value! - item.delta!;
                        return <div key={item.key} style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr', alignItems:'center', gap:10, background:'#F7F7F7', borderRadius:13, padding:'11px 12px' }}>
                          <div><div style={{fontSize:9,color:'#888'}}>DÉBUT</div><div style={{fontSize:15,fontWeight:950}}>{start.toFixed(1)} cm</div></div>
                          <div style={{fontSize:16,color:'#999'}}>→</div>
                          <div style={{textAlign:'right'}}><div style={{fontSize:9,color:'#888'}}>ACTUEL</div><div style={{fontSize:15,fontWeight:950}}>{item.value!.toFixed(1)} cm</div></div>
                        </div>
                      })}
                    </div>
                  )}
                </div>
              )}

              <div style={{ fontSize: 10.5, color: '#777', fontWeight: 900, letterSpacing: '.09em', margin: '22px 2px 10px' }}>MENSURATIONS</div>
              {logs.filter(l => l.waist_cm || l.chest_cm).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '55px 20px', borderRadius: 22, background: SURFACE, border: `1px solid ${BORDER}` }}>
                  <div style={{ fontSize: 18, fontWeight: 950 }}>MESURE TON ÉVOLUTION</div>
                  <div style={{ fontSize: 12.5, color: '#777', lineHeight: 1.55, margin: '9px auto 20px', maxWidth: 310 }}>Le poids ne raconte pas tout. Ajoute tes mensurations pour mieux suivre ta transformation.</div>
                  <button onClick={() => setShowAdd(true)} style={{ border: 0, borderRadius: 12, background: ACCENT, color: '#050505', padding: '12px 17px', fontWeight: 950, cursor: 'pointer' }}>AJOUTER DES MESURES</button>
                </div>
              ) : logs.filter(l => l.waist_cm || l.chest_cm).slice(0, 5).map(log => (
                <div key={log.id} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 18, padding: 16, marginBottom: 11 }}>
                  <div style={{ fontSize: 10.5, color: '#666', fontWeight: 850, marginBottom: 12 }}>{new Date(log.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 8 }}>
                    {[
                      { key: 'chest_cm', label: 'Poitrine' },
                      { key: 'waist_cm', label: 'Taille' },
                      { key: 'hips_cm', label: 'Hanches' },
                      { key: 'arms_cm', label: 'Bras' },
                      { key: 'thighs_cm', label: 'Cuisses' },
                    ].filter(m => log[m.key]).map(({ key, label }) => (
                      <div key={key} style={{ background: '#F7F7F7', border: '1px solid #EAEAEA', borderRadius: 13, padding: 13 }}>
                        <div style={{ fontSize: 18, fontWeight: 950 }}>{log[key]} <span style={{ fontSize: 10, color: '#666' }}>cm</span></div>
                        <div style={{ fontSize: 9.5, color: '#777', marginTop: 4, textTransform: 'uppercase', fontWeight: 800 }}>{label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}

          {tab === 'activity' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 10, marginBottom: 12 }}>
                <div style={{ borderRadius: 18, padding: 17, background: SURFACE, border: `1px solid ${BORDER}` }}>
                  <div style={{ fontSize: 9.5, color: '#666', fontWeight: 900, letterSpacing: '.08em' }}>AUJOURD'HUI</div>
                  <div style={{ fontSize: 28, fontWeight: 950, marginTop: 6 }}>{Math.round(todayMinutes)} <span style={{ fontSize: 11, color: '#666' }}>min</span></div>
                </div>
                <div style={{ borderRadius: 18, padding: 17, background: SURFACE, border: `1px solid ${BORDER}` }}>
                  <div style={{ fontSize: 9.5, color: '#666', fontWeight: 900, letterSpacing: '.08em' }}>MACHINE / EST.</div>
                  <div style={{ fontSize: 28, fontWeight: 950, marginTop: 6, color: ACCENT }}>{Math.round(todayCalories)} <span style={{ fontSize: 11, color: '#666' }}>kcal</span></div>
                </div>
              </div>

              <div style={{ borderRadius: 18, padding: 15, background: '#F2F8E7', border: '1px solid rgba(183,255,0,.16)', color: '#666', fontSize: 11.5, lineHeight: 1.55, marginBottom: 16 }}>
                Les calories d’activité sont des estimations de machine ou de saisie. NOX les suit séparément et <strong style={{ color: '#0A0A0A' }}>ne les rajoute pas automatiquement à ta cible Fuel</strong>.
              </div>

              <div style={{ display: 'grid', gap: 10 }}>
                <button onClick={openManualActivity} style={{ border: 0, borderRadius: 16, background: ACCENT, color: '#050505', padding: 15, fontSize: 11.5, fontWeight: 950, cursor: 'pointer' }}>+ SAISIR UNE ACTIVITÉ</button>
                <button onClick={openScanActivity} style={{ borderRadius: 16, border: `1px solid ${BORDER}`, background: SURFACE, color: '#0A0A0A', padding: 15, fontSize: 11.5, fontWeight: 950, cursor: 'pointer' }}>SCANNER L'ÉCRAN D'UNE MACHINE</button>
              </div>

              {activityError && !showActivity && (
                <div role="alert" style={{ marginTop: 14, borderRadius: 12, padding: '10px 12px', background: 'rgba(255,95,95,.08)', border: '1px solid rgba(255,95,95,.22)', color: '#ff8a8a', fontSize: 11.5 }}>{activityError}</div>
              )}

              <div style={{ fontSize: 10.5, color: '#777', fontWeight: 900, letterSpacing: '.09em', margin: '24px 2px 10px' }}>HISTORIQUE ACTIVITÉ</div>
              {activities.length === 0 ? (
                <div style={{ borderRadius: 18, padding: '35px 20px', background: SURFACE, border: `1px solid ${BORDER}`, textAlign: 'center', color: '#666', fontSize: 12 }}>Aucune activité enregistrée.</div>
              ) : activities.slice(0, 20).map(activity => (
                <div key={activity.id} style={{ borderRadius: 16, padding: 15, background: SURFACE, border: `1px solid ${BORDER}`, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <div>
                      <div style={{ fontWeight: 950, fontSize: 15 }}>{activity.activity_type}</div>
                      <div style={{ color: '#666', fontSize: 10.5, marginTop: 4 }}>
                        {new Date(activity.performed_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} · {activity.source === 'machine_scan' ? 'scan machine' : 'saisie manuelle'}
                      </div>
                    </div>
                    <button onClick={() => void deleteActivity(activity.id)} aria-label="Supprimer l'activité" style={{ border: 0, background: 'transparent', color: '#555', cursor: 'pointer', fontSize: 18 }}>×</button>
                  </div>
                  <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 12, fontSize: 12, fontWeight: 850 }}>
                    <span>{activity.duration_minutes} min</span>
                    {activity.calories_burned != null && <span style={{ color: ACCENT }}>{activity.calories_burned} kcal</span>}
                    {activity.distance_km != null && <span>{Number(activity.distance_km).toFixed(2)} km</span>}
                  </div>
                  {activity.notes && <div style={{ color: '#777', fontSize: 11, lineHeight: 1.45, marginTop: 9 }}>{activity.notes}</div>}
                </div>
              ))}
            </>
          )}

          {tab === 'photos' && (
            <div style={{ minHeight: 330, borderRadius: 22, border: '1px solid rgba(183,255,0,.16)', background: 'radial-gradient(circle at 50% 15%, rgba(183,255,0,.20), transparent 34%), #FFFFFF', padding: '44px 22px', textAlign: 'center' }}>
              <div style={{ display: 'inline-block', color: ACCENT, fontSize: 10, fontWeight: 950, letterSpacing: '.12em', marginBottom: 13 }}>NOX FUTURE</div>
              <div style={{ fontSize: 22, fontWeight: 950, letterSpacing: '-.03em' }}>TA TRANSFORMATION EN IMAGES</div>
              <div style={{ fontSize: 12.5, color: '#858585', lineHeight: 1.6, maxWidth: 330, margin: '10px auto 23px' }}>Ajoute tes photos de progression et accède à ta timeline NOX FUTURE. Tes photos restent privées.</div>
              <button onClick={() => window.location.href = '/future'} style={{ border: 0, borderRadius: 13, background: ACCENT, color: '#050505', padding: '13px 19px', fontSize: 11.5, fontWeight: 950, cursor: 'pointer' }}>OUVRIR NOX FUTURE</button>
              <div style={{ fontSize: 9.5, color: '#555', lineHeight: 1.5, marginTop: 16 }}>Les projections IA sont indicatives et ne garantissent pas un résultat physique.</div>
            </div>
          )}
        </section>
      </main>

      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.82)', backdropFilter: 'blur(8px)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: 560, background: '#FFFFFF', border: `1px solid ${BORDER}`, borderBottom: 0, borderRadius: '24px 24px 0 0', padding: '10px 20px max(24px, env(safe-area-inset-bottom))', maxHeight: '88vh', overflowY: 'auto' }}>
            <div style={{ width: 38, height: 4, background: '#2b2b2b', borderRadius: 999, margin: '2px auto 17px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 10, color: ACCENT, fontWeight: 900, letterSpacing: '.1em' }}>BODY</div>
                <div style={{ fontSize: 19, fontWeight: 950, marginTop: 3 }}>NOUVEAU CHECK-IN</div>
              </div>
              <button onClick={() => setShowAdd(false)} style={{ width: 36, height: 36, borderRadius: 12, border: `1px solid ${BORDER}`, background: '#F3F3F3', color: '#666', fontSize: 21, cursor: 'pointer' }}>×</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 10 }}>
              {[
                { key: 'weight', label: 'Poids', unit: 'kg', placeholder: '80.5' },
                { key: 'chest_cm', label: 'Poitrine', unit: 'cm', placeholder: '—' },
                { key: 'waist_cm', label: 'Taille', unit: 'cm', placeholder: '—' },
                { key: 'hips_cm', label: 'Hanches', unit: 'cm', placeholder: '—' },
                { key: 'arms_cm', label: 'Bras', unit: 'cm', placeholder: '—' },
                { key: 'thighs_cm', label: 'Cuisses', unit: 'cm', placeholder: '—' },
              ].map(({ key, label, unit, placeholder }) => (
                <label key={key} style={{ display: 'block', background: '#F7F7F7', border: `1px solid ${BORDER}`, borderRadius: 14, padding: 12 }}>
                  <div style={{ fontSize: 9.5, color: '#777', fontWeight: 850, textTransform: 'uppercase' }}>{label}</div>
                  <div style={{ display: 'flex', alignItems: 'center', marginTop: 5 }}>
                    <input value={(form as any)[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} placeholder={placeholder} type="number" inputMode="decimal" style={{ width: '100%', minWidth: 0, border: 0, outline: 0, background: 'transparent', color: '#0A0A0A', fontSize: 18, fontWeight: 900 }} />
                    <span style={{ color: '#555', fontSize: 10 }}>{unit}</span>
                  </div>
                </label>
              ))}
            </div>

            <label style={{ display: 'block', marginTop: 10 }}>
              <div style={{ fontSize: 9.5, color: '#777', fontWeight: 850, textTransform: 'uppercase', marginBottom: 6 }}>Note</div>
              <input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Comment tu te sens aujourd'hui ?" type="text" style={{ width: '100%', boxSizing: 'border-box', border: `1px solid ${BORDER}`, outline: 0, background: '#F7F7F7', color: '#0A0A0A', borderRadius: 14, padding: '13px 14px', fontSize: 13 }} />
            </label>

            {saveError && <div role="alert" style={{ marginTop: 12, borderRadius: 12, padding: '10px 12px', background: 'rgba(255,95,95,.08)', border: '1px solid rgba(255,95,95,.22)', color: '#ff8a8a', fontSize: 11.5, lineHeight: 1.45 }}>{saveError}</div>}
            {saveSuccess && <div style={{ marginTop: 12, borderRadius: 12, padding: '10px 12px', background: 'rgba(183,255,0,.08)', border: '1px solid rgba(183,255,0,.22)', color: ACCENT, fontSize: 11.5, fontWeight: 850 }}>Check-in enregistré ✓</div>}
            <button onClick={save} disabled={saving} style={{ width: '100%', border: 0, borderRadius: 14, background: saving ? '#2a2a2a' : ACCENT, color: saving ? '#777' : '#050505', padding: 15, marginTop: 16, fontSize: 12, fontWeight: 950, letterSpacing: '.04em', cursor: saving ? 'wait' : 'pointer' }}>{saving ? 'ENREGISTREMENT...' : 'ENREGISTRER LE CHECK-IN'}</button>
          </div>
        </div>
      )}

      {showActivity && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.86)', backdropFilter: 'blur(8px)', zIndex: 210, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: 560, background: '#FFFFFF', border: `1px solid ${BORDER}`, borderBottom: 0, borderRadius: '24px 24px 0 0', padding: '10px 20px max(24px, env(safe-area-inset-bottom))', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ width: 38, height: 4, background: '#2b2b2b', borderRadius: 999, margin: '2px auto 17px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div>
                <div style={{ fontSize: 10, color: ACCENT, fontWeight: 900, letterSpacing: '.1em' }}>NOX ACTIVITY</div>
                <div style={{ fontSize: 19, fontWeight: 950, marginTop: 3 }}>
                  {activityMode === 'confirm' ? 'CONFIRMER LES DONNÉES' : 'NOUVELLE ACTIVITÉ'}
                </div>
              </div>
              <button onClick={() => setShowActivity(false)} style={{ width: 36, height: 36, borderRadius: 12, border: `1px solid ${BORDER}`, background: '#F3F3F3', color: '#666', fontSize: 21, cursor: 'pointer' }}>×</button>
            </div>

            {(activityMode === 'manual' || activityMode === 'confirm') && (
              <>
                {activityMode === 'confirm' && (
                  <div style={{ borderRadius: 13, padding: '11px 12px', marginBottom: 12, background: 'rgba(183,255,0,.06)', border: '1px solid rgba(183,255,0,.18)', color: '#666', fontSize: 11.5, lineHeight: 1.5 }}>
                    Données lues par IA. <strong style={{ color: '#0A0A0A' }}>Vérifie et corrige chaque valeur</strong> avant l’enregistrement.
                  </div>
                )}
                <div style={{ display: 'grid', gap: 10 }}>
                  {activityInput('activity_type', "Type d'activité", undefined, 'Tapis, vélo, elliptique…')}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 10 }}>
                    {activityInput('duration_minutes', 'Durée', 'min', '30')}
                    {activityInput('calories_burned', 'Calories estimées', 'kcal', '250')}
                    {activityInput('distance_km', 'Distance', 'km', '5.2')}
                  </div>
                  {activityInput('notes', 'Note', undefined, 'Optionnel')}
                </div>
                <div style={{ color: '#666', fontSize: 10.5, lineHeight: 1.5, marginTop: 12 }}>
                  Les calories affichées par les machines restent des estimations. Elles sont conservées comme données d’activité, pas comme calories automatiquement “à manger”.
                </div>
                <button onClick={() => void saveActivity()} disabled={activitySaving} style={{ width: '100%', border: 0, borderRadius: 14, background: activitySaving ? '#2a2a2a' : ACCENT, color: activitySaving ? '#777' : '#050505', padding: 15, marginTop: 16, fontSize: 12, fontWeight: 950, cursor: activitySaving ? 'wait' : 'pointer' }}>
                  {activitySaving ? 'ENREGISTREMENT...' : activityMode === 'confirm' ? 'CONFIRMER ET ENREGISTRER' : "ENREGISTRER L'ACTIVITÉ"}
                </button>
              </>
            )}

            {activityError && <div role="alert" style={{ marginTop: 12, borderRadius: 12, padding: '10px 12px', background: 'rgba(255,95,95,.08)', border: '1px solid rgba(255,95,95,.22)', color: '#ff8a8a', fontSize: 11.5, lineHeight: 1.45 }}>{activityError}</div>}
            {activitySuccess && <div style={{ marginTop: 12, borderRadius: 12, padding: '10px 12px', background: 'rgba(183,255,0,.08)', border: '1px solid rgba(183,255,0,.22)', color: ACCENT, fontSize: 11.5, fontWeight: 850 }}>Activité enregistrée ✓</div>}
          </div>
        </div>
      )}

      <BottomNav active="progress" />
    </div>
  );
}
