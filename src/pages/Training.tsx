import { calculateProgressiveOverload, detectStagnation } from '../lib/noxBrain';
import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import {
  getNoxExerciseAnatomyImage,
  getNoxExerciseCoachTips,
  getNoxExerciseHdCover,
  getNoxExerciseHdPositions,
  getNoxExerciseMistakes,
  getNoxExerciseMovementImages,
  getNoxExerciseMuscles,
  getNoxExerciseSteps,
  getNoxExerciseThumbnail,
  getNoxExerciseVariants,
  resolveNoxExercise,
} from '../lib/noxExercises';
export function parseRestSeconds(value: string | number | null | undefined): number {
if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
return Math.round(value);
}
if (!value || typeof value !== 'string') return 90;
const normalized = value.trim().toLowerCase().replace(',', '.');
const matches = normalized.match(/\d+(?:.\d+)?/g)?.map(Number) || [];
if (matches.length === 0) return 90;
const average = matches.length >= 2 ? (matches[0] + matches[1]) / 2 : matches[0];
const isMinutes = /\b(min|mins|minute|minutes)\b/.test(normalized);
const seconds = isMinutes ? average * 60 : average;
return Math.max(1, Math.round(seconds));
}
function localDateKey(date: Date): string {
const year = date.getFullYear();
const month = String(date.getMonth() + 1).padStart(2, '0');
const day = String(date.getDate()).padStart(2, '0');
return `${year}-${month}-${day}`;
}
export function calculateTrainingStreak(completedDates: string[], today = new Date()): number {
const uniqueDays = new Set(
completedDates
.map(value => new Date(value))
.filter(date => !Number.isNaN(date.getTime()))
.map(localDateKey),
);
let streak = 0;
const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
while (uniqueDays.has(localDateKey(cursor))) {
streak += 1;
cursor.setDate(cursor.getDate() - 1);
}
return streak;
}
const ACCENT = '#B7FF00';
const BG = '#F6F7F2';
const SURFACE = '#FFFFFF';
const BORDER = '#E8EAE2';
function resolvedNoxExercise(exercise: any) {
  return resolveNoxExercise({
    exercise_id: exercise?.exercise_id,
    id: exercise?.id,
    name: exercise?.name,
    exercise_name: exercise?.exercise_name,
  });
}

function muscleTags(exercise: any): string[] {
  const nox = resolvedNoxExercise(exercise);
  if (nox) {
    const muscles = getNoxExerciseMuscles(nox.id);
    return Array.from(new Set([
      ...muscles.primary,
      ...muscles.secondary,
      ...muscles.stabilizers,
    ].filter(Boolean))).slice(0, 4);
  }

  const raw = String(exercise?.muscles || '');
  return raw.trim()
    ? raw.split(/[·,/]/).map((x: string) => x.trim()).filter(Boolean).slice(0, 4)
    : [];
}

export default function Training() {
const { sessionId } = useParams();
const { user } = useAuth();
const navigate = useNavigate();
const [exercises, setExercises] = useState<any[]>([]);
const [sessionName, setSessionName] = useState('');
const [currentIdx, setCurrentIdx] = useState(0);
const [currentSet, setCurrentSet] = useState(1);
const [weight, setWeight] = useState('');
const [reps, setReps] = useState('');
const [resting, setResting] = useState(false);
const [restTime, setRestTime] = useState(0);
const [restMax, setRestMax] = useState(90);
const [completedSets, setCompletedSets] = useState<any[]>([]);
const [newPR, setNewPR] = useState<any>(null);
const [exerciseNotes, setExerciseNotes] = useState<Record<string, string>>({});
const [showNotes, setShowNotes] = useState(false);
const [warmupSets, setWarmupSets] = useState<Record<number, boolean>>({});
const [showSubstitute, setShowSubstitute] = useState(false);
const [comebackMode, setComebackMode] = useState(false);
const [isOffline, setIsOffline] = useState(!navigator.onLine);
const [pendingSync, setPendingSync] = useState(0);
const [overloadSuggestion, setOverloadSuggestion] = useState<any>(null);
const [stagnation, setStagnation] = useState<any>(null);
const [trainingError, setTrainingError] = useState('');
const [done, setDone] = useState(false);
const [workoutId, setWorkoutId] = useState<string | null>(null);
const [loading, setLoading] = useState(true);
const [savingSet, setSavingSet] = useState(false);
const [showDemo, setShowDemo] = useState(false);
const [startTime] = useState(Date.now());
const timerRef = useRef<any>(null);
const finishingRef = useRef(false);
useEffect(() => {
if (!user) return;
loadSession();
return () => clearInterval(timerRef.current);
}, [user, sessionId]);
const loadSession = async () => {
setLoading(true);
setTrainingError('');

try {
  const { data: prog, error: programError } = await supabase
    .from('workout_programs')
    .select('*')
    .eq('user_id', user!.id)
    .eq('is_active', true)
    .maybeSingle();

  if (programError) throw programError;

  if (!prog?.program_json) {
    setLoading(false);
    return;
  }

  const sessions: any[] = Array.isArray(prog.program_json.sessions)
    ? prog.program_json.sessions
    : [];
  let session: any = null;

  const idx = parseInt(sessionId || '0');
  if (!isNaN(idx) && sessions[idx]) {
    session = sessions[idx];
  } else {
    const days = ['DIM', 'LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM'];
    const todayDay = days[new Date().getDay()];
    session =
      sessions.find((s: any) => s.day === todayDay || s.id === sessionId) ||
      sessions[0];
  }

  if (!session) {
    setLoading(false);
    return;
  }

  setSessionName(session.name || 'SÉANCE');
  setExercises(Array.isArray(session.exercises) ? session.exercises : []);

  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);

  const { data: existingWorkout, error: existingError } = await supabase
    .from('workouts')
    .select('id, started_at')
    .eq('user_id', user!.id)
    .eq('program_id', prog.id)
    .eq('name', session.name)
    .eq('status', 'in_progress')
    .gte('started_at', dayStart.toISOString())
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) throw existingError;

  if (existingWorkout?.id) {
    setWorkoutId(existingWorkout.id);

    // Reprendre réellement la séance après un refresh : recharge les séries
    // déjà persistées et replace le curseur sur la prochaine série à faire.
    const { data: resumedSets, error: resumedSetsError } = await supabase
      .from('workout_sets')
      .select('exercise_name, set_number, weight, reps, created_at')
      .eq('user_id', user!.id)
      .eq('workout_id', existingWorkout.id)
      .order('created_at', { ascending: true });

    if (resumedSetsError) throw resumedSetsError;

    const restored = resumedSets || [];
    setCompletedSets(restored);

    if (restored.length > 0) {
      let nextExerciseIdx = 0;
      let nextSetNumber = 1;
      let foundNext = false;

      for (let exerciseIdx = 0; exerciseIdx < (session.exercises || []).length; exerciseIdx += 1) {
        const exercise = session.exercises[exerciseIdx];
        const expectedSets = Math.max(1, parseInt(exercise?.sets) || 3);
        const exerciseSets = restored.filter((row: any) => row.exercise_name === exercise?.name);
        const completedNumbers = new Set(exerciseSets.map((row: any) => Number(row.set_number)));

        for (let setNumber = 1; setNumber <= expectedSets; setNumber += 1) {
          if (!completedNumbers.has(setNumber)) {
            nextExerciseIdx = exerciseIdx;
            nextSetNumber = setNumber;
            foundNext = true;
            break;
          }
        }

        if (foundNext) break;
      }

      if (foundNext) {
        setCurrentIdx(nextExerciseIdx);
        setCurrentSet(nextSetNumber);
      } else {
        // Toutes les séries existent déjà. On reste sur la dernière série
        // sans en créer une en double ; l'utilisateur peut terminer proprement.
        const lastExerciseIdx = Math.max(0, (session.exercises || []).length - 1);
        const lastExercise = session.exercises?.[lastExerciseIdx];
        setCurrentIdx(lastExerciseIdx);
        setCurrentSet(Math.max(1, parseInt(lastExercise?.sets) || 3));
      }
    }
  } else {
    const { data: wk, error: workoutError } = await supabase
      .from('workouts')
      .insert({
        user_id: user!.id,
        program_id: prog.id,
        name: session.name,
        started_at: new Date().toISOString(),
        status: 'in_progress',
        created_at: new Date().toISOString(),
      })
      .select()
      .maybeSingle();

    if (workoutError) throw workoutError;
    if (!wk?.id) throw new Error("Impossible de créer la séance.");
    setWorkoutId(wk.id);
  }
} catch (err: any) {
  console.error('Training loadSession:', err);
  setTrainingError(err?.message || 'Impossible de charger la séance.');
} finally {
  setLoading(false);
}

};
useEffect(() => {
if (!user || !exercises.length || !exercises[currentIdx]?.name) {
setOverloadSuggestion(null);
setStagnation(null);
return;
}

let cancelled = false;
const exercise = exercises[currentIdx];

const loadExerciseIntelligence = async () => {
  let historicalSets: any[] = [];

  let historyQuery = supabase
    .from('workout_sets')
    .select('workout_id, weight, reps, set_number, created_at')
    .eq('user_id', user.id)
    .eq('exercise_name', exercise.name);

  // Les séries de la séance en cours ne doivent jamais servir à décider
  // de la charge de cette même séance.
  if (workoutId) historyQuery = historyQuery.neq('workout_id', workoutId);

  const { data: setRows, error: setRowsError } = await historyQuery
    .order('created_at', { ascending: false })
    .limit(40);

  if (!setRowsError && Array.isArray(setRows)) {
    historicalSets = setRows;
  } else {
    // Compatibilité avec la base actuelle : tant que workout_sets n'existe pas,
    // on ne fabrique pas un faux historique à partir d'un PR unique.
    if (setRowsError) {
      console.warn('Historique détaillé workout_sets indisponible:', setRowsError.message);
    }
  }

  if (cancelled) return;

  const repNumbers = String(exercise.reps || '')
    .match(/\d+(?:[.,]\d+)?/g)
    ?.map((value: string) => Number(value.replace(',', '.')))
    .filter((value: number) => Number.isFinite(value)) || [];

  const targetMin = repNumbers.length ? Math.max(1, Math.floor(repNumbers[0])) : 8;
  const targetMax = repNumbers.length > 1
    ? Math.max(targetMin, Math.floor(repNumbers[1]))
    : targetMin;

  if (historicalSets.length >= 3) {
    setOverloadSuggestion(
      calculateProgressiveOverload(
        exercise.name,
        historicalSets,
        targetMin,
        targetMax,
      ),
    );
    setStagnation(detectStagnation(historicalSets));
  } else {
    setOverloadSuggestion(null);
    setStagnation(null);
  }
};

void loadExerciseIntelligence();

return () => {
  cancelled = true;
};

}, [user, exercises, currentIdx, workoutId]);
const startRest = (seconds: number) => {
clearInterval(timerRef.current);
setRestMax(seconds);
setRestTime(seconds);
setResting(true);
timerRef.current = setInterval(() => {
setRestTime(t => {
if (t <= 1) {
clearInterval(timerRef.current);
setResting(false);
return 0;
}
return t - 1;
});
}, 1000);
};
const skipRest = () => {
clearInterval(timerRef.current);
setResting(false);
setRestTime(0);
};
const validateSet = async () => {
    if (savingSet || !user) return;

    // Si hors réseau, stocker localement
    if (isOffline) {
      const ex = exercises[currentIdx];
      if (ex) {
        queueOffline('workout_set', {
          workout_id: workoutId,
          exercise_name: ex.name,
          set_number: currentSet,
          weight: parseFloat(String(weight).replace(',','.')) || 0,
          reps: parseInt(String(reps)) || 0,
          created_at: new Date().toISOString(),
          workoutId,
        });
        setCurrentSet(s => s + 1);
        setWeight('');
        setReps('');
      }
      return;
    }

const ex = exercises[currentIdx];
if (!ex || !workoutId) {
  setTrainingError("La séance n'est pas encore prête. Réessaie.");
  return;
}

const parsedWeight = Number(String(weight).replace(',', '.'));
const parsedReps = Number(reps);

if (!Number.isFinite(parsedWeight) || parsedWeight < 0) {
  setTrainingError('Entre une charge valide.');
  return;
}
if (!Number.isInteger(parsedReps) || parsedReps <= 0 || parsedReps > 200) {
  setTrainingError('Entre un nombre de répétitions valide.');
  return;
}

setSavingSet(true);
setTrainingError('');

try {
  const now = new Date().toISOString();
  const setData = {
    exercise_name: ex.name,
    set_number: currentSet,
    weight: parsedWeight,
    reps: parsedReps,
    created_at: now,
  };

  // Persistance indispensable au moteur de progression.
  // La série doit être écrite avant toute progression de l'interface.
  const { error: setInsertError } = await supabase
    .from('workout_sets')
    .insert({
      user_id: user.id,
      workout_id: workoutId,
      exercise_name: ex.name,
      set_number: currentSet,
      weight: parsedWeight,
      reps: parsedReps,
      created_at: now,
    });

  if (setInsertError) {
    // workout_sets alimente directement noxBrain. Avancer malgré cet échec
    // donnerait l'impression que NOX apprend alors que la série est perdue.
    throw new Error(`Série non enregistrée : ${setInsertError.message}`);
  }

  const { data: best, error: bestError } = await supabase
    .from('personal_records')
    .select('*')
    .eq('user_id', user.id)
    .eq('exercise_name', ex.name)
    .maybeSingle();

  if (bestError) throw bestError;

  const previousWeight = Number(best?.weight || 0);
  const previousReps = Number(best?.reps || 0);
  const isPR =
    !best ||
    parsedWeight > previousWeight ||
    (parsedWeight === previousWeight && parsedReps > previousReps);

  if (isPR) {
    const { error: prError } = await supabase
      .from('personal_records')
      .upsert(
        {
          user_id: user.id,
          exercise_name: ex.name,
          weight: parsedWeight,
          reps: parsedReps,
          created_at: now,
        },
        { onConflict: 'user_id,exercise_name' },
      );

    if (prError) throw prError;

    setNewPR({ name: ex.name, weight: parsedWeight, reps: parsedReps });
    window.setTimeout(() => setNewPR(null), 3000);
  }

  setCompletedSets(prev => [...prev, setData]);

  const totalSets = parseInt(ex.sets) || 3;
  const restSecs = parseRestSeconds(ex.rest);

  if (currentSet >= totalSets) {
    setCurrentSet(1);

    if (currentIdx >= exercises.length - 1) {
      await finishWorkout();
    } else {
      setCurrentIdx(i => i + 1);
      startRest(restSecs);
    }
  } else {
    setCurrentSet(s => s + 1);
    startRest(restSecs);
  }

  setWeight('');
  setReps('');
} catch (err: any) {
  console.error('Training validateSet:', err);
  setTrainingError(err?.message || "Impossible d'enregistrer cette série.");
} finally {
  setSavingSet(false);
}

};
const finishWorkout = async () => {
if (finishingRef.current || !user) return;
finishingRef.current = true;
setTrainingError('');

try {
  const duration = Math.max(1, Math.round((Date.now() - startTime) / 60000));

  if (!workoutId) throw new Error("Séance introuvable.");

  const { error: finishError } = await supabase
    .from('workouts')
    .update({
      status: 'completed',
      finished_at: new Date().toISOString(),
      duration_minutes: duration,
    })
    .eq('id', workoutId)
    .eq('user_id', user.id)
    .eq('status', 'in_progress');

  if (finishError) throw finishError;

  const { data: completedWorkouts, error: historyError } = await supabase
    .from('workouts')
    .select('finished_at, started_at')
    .eq('user_id', user.id)
    .eq('status', 'completed')
    .order('started_at', { ascending: false })
    .limit(120);

  if (historyError) throw historyError;

  const streak = calculateTrainingStreak(
    (completedWorkouts || [])
      .map((w: any) => w.finished_at || w.started_at)
      .filter(Boolean),
  );

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('xp')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) throw profileError;

  const { error: rewardError } = await supabase
    .from('profiles')
    .update({
      streak_days: streak,
      xp: Number(profile?.xp || 0) + 50,
    })
    .eq('id', user.id);

  if (rewardError) throw rewardError;

  setDone(true);
} catch (err: any) {
  console.error('Training finishWorkout:', err);
  setTrainingError(err?.message || 'Impossible de terminer la séance.');
} finally {
  finishingRef.current = false;
}

};
const abandonWorkout = async () => {
setTrainingError('');

try {
  if (workoutId) {
    // workout_sets est lié au workout avec ON DELETE CASCADE :
    // abandonner supprime aussi les séries de cette séance incomplète.
    const { error: abandonError } = await supabase
      .from('workouts')
      .delete()
      .eq('id', workoutId)
      .eq('user_id', user!.id)
      .eq('status', 'in_progress');

    if (abandonError) throw abandonError;
  }

  navigate('/home');
} catch (err: any) {
  console.error('Training abandonWorkout:', err);
  setTrainingError(err?.message || "Impossible d'abandonner la séance proprement.");
}

};
// ─── LOADING ────────────────────────────────────────────────
if (loading) return (
<div style={{ minHeight: '100vh', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
<NoxBrand />
<div style={{ width: 38, height: 38, border: '3px solid #ECECE7', borderTop: '3px solid ' + ACCENT, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
<div style={{ color: '#77776F', fontSize: 12, fontWeight: 700 }}>Chargement de la séance...</div>
<style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
</div>
);
if (!exercises.length) return (
<div style={{ minHeight: '100vh', background: '#FFFFFF', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center' }}>
<NoxBrand />
<div style={{ width: 72, height: 72, marginTop: 34, borderRadius: 22, background: '#F3F3EF', display: 'grid', placeItems: 'center', fontSize: 28, fontWeight: 1000, color: ACCENT }}>N</div>
<div style={{ fontSize: 22, fontWeight: 1000, color: '#111', marginTop: 18, marginBottom: 8 }}>Séance introuvable</div>
<div style={{ fontSize: 13, lineHeight: 1.5, color: '#77776F', marginBottom: 24, maxWidth: 300 }}>Génère d'abord un programme depuis l'onglet Training.</div>
<button onClick={() => navigate('/generate-program')}
style={{ width: '100%', maxWidth: 320, padding: '16px 24px', background: ACCENT, border: 'none', borderRadius: 13, color: '#111', fontWeight: 1000, cursor: 'pointer' }}>
CRÉER UN PROGRAMME →
</button>
</div>
);
// ─── DONE ───────────────────────────────────────────────────
if (done) {
const duration = Math.max(1, Math.round((Date.now() - startTime) / 60000));

return (
  <div style={{ minHeight: '100vh', background: '#FFFFFF', color: '#111', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 28, textAlign: 'center' }}>
    <NoxBrand />
    <div style={{ width: 84, height: 84, borderRadius: 28, background: ACCENT, display: 'grid', placeItems: 'center', marginTop: 34, fontSize: 40, fontWeight: 1000 }}>✓</div>
    <div style={{ fontSize: 10, color: '#77776F', textTransform: 'uppercase', letterSpacing: '.18em', marginTop: 22, marginBottom: 7, fontWeight: 900 }}>Complété</div>
    <div style={{ fontSize: 29, lineHeight: .95, fontWeight: 1000, color: '#111', marginBottom: 28, letterSpacing: '-.045em' }}>SÉANCE TERMINÉE</div>

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, width: '100%', maxWidth: 340, marginBottom: 14 }}>
      <DoneMetric label="Durée" value={`${duration} min`} symbol="◷" />
      <DoneMetric label="Exercices" value={String(exercises.length)} symbol="▥" />
      <DoneMetric label="Séries" value={String(completedSets.length)} symbol="✓" />
    </div>

    <div style={{ background: '#F8FFE5', border: `1px solid ${ACCENT}`, borderRadius: 13, padding: 14, marginBottom: 24, width: '100%', maxWidth: 340 }}>
      <div style={{ fontSize: 12, color: '#111', fontWeight: 900 }}>+50 XP · Streak recalculé</div>
      <div style={{ fontSize: 10.5, color: '#77776F', marginTop: 4 }}>NOX a enregistré ta progression.</div>
    </div>

    <button onClick={() => navigate('/home')}
      style={{ width: '100%', maxWidth: 340, padding: 17, background: ACCENT, border: 'none', borderRadius: 13, color: '#111', fontWeight: 1000, fontSize: 13, cursor: 'pointer' }}>
      RETOUR À L'ACCUEIL →
    </button>
  </div>
);

}
const ex = exercises[currentIdx];
const noxExercise = resolvedNoxExercise(ex);
const tags = muscleTags(ex);
const totalSets = parseInt(ex?.sets) || 3;
const exerciseProgress = ((currentIdx + (currentSet - 1) / totalSets) / exercises.length) * 100;
return (
<div style={{
minHeight: '100vh',
background: resting ? '#090909' : '#F6F7F2',
color: resting ? '#fff' : '#111',
display: 'flex',
flexDirection: 'column',
transition: 'background .25s ease, color .25s ease',
}}>
<main style={{
width: '100%',
maxWidth: 560,
minHeight: '100vh',
margin: '0 auto',
background: resting ? '#090909' : '#F6F7F2',
display: 'flex',
flexDirection: 'column',
}}>
{/* Header */}
<div style={{ padding: '18px 20px 0', flexShrink: 0 }}>
<div style={{ display: 'grid', gridTemplateColumns: '38px 1fr 38px', alignItems: 'center', marginBottom: 13 }}>
<button
onClick={() => { if (confirm('Abandonner la séance ?')) void abandonWorkout(); }}
aria-label="Abandonner la séance"
style={{
width: 36, height: 36, border: 'none', background: 'transparent',
color: resting ? '#6B6B6B' : '#111', cursor: 'pointer',
fontSize: 27, lineHeight: 1, display: 'grid', placeItems: 'center', padding: 0,
}}
>
×
</button>

        <div style={{ textAlign: 'center', minWidth: 0 }}>
          {!resting && <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}><NoxBrand compact /></div>}
          <div style={{
            fontSize: resting ? 13 : 11,
            fontWeight: 950,
            color: resting ? '#626262' : '#77776F',
            textTransform: 'uppercase',
            letterSpacing: '.08em',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {sessionName}
          </div>
        </div>

        <div style={{ textAlign: 'right', fontSize: 12, fontWeight: 800, color: resting ? '#626262' : '#77776F' }}>
          {currentIdx + 1}/{exercises.length}
        </div>
      </div>

      <div style={{ height: 4, background: resting ? '#1B1B1B' : '#ECECE8', borderRadius: 999, overflow: 'hidden', marginBottom: resting ? 12 : 20 }}>
        <div style={{ height: '100%', width: `${Math.max(3, exerciseProgress)}%`, background: ACCENT, borderRadius: 999, transition: 'width .4s' }} />
      </div>
    </div>

    {trainingError && (
      <div style={{ margin: '0 20px 12px', background: '#FFF2F2', border: '1px solid #FFB8B8', borderRadius: 13, padding: '11px 13px', color: '#9B1C1C', fontSize: 11.5, lineHeight: 1.45, fontWeight: 750 }}>
        {trainingError}
      </div>
    )}

    {stagnation?.stagnating && !resting && (
      <div style={{ margin: '0 20px 12px', background: '#FAFAF8', border: '1px solid #E1E1DC', borderRadius: 13, padding: '11px 13px' }}>
        <div style={{ fontSize: 9.5, color: '#111', fontWeight: 1000, textTransform: 'uppercase', letterSpacing: '.07em' }}>ANALYSE NOX</div>
        <div style={{ fontSize: 11, color: '#66665F', marginTop: 4, lineHeight: 1.45 }}>{stagnation.suggestion}</div>
      </div>
    )}

    {/* Offline Banner */}
    {isOffline && (
      <div style={{ margin: '0 20px 10px', background: '#ff440011', border: '1px solid #ff440033', borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 16 }}>📡</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: '#ff6666', fontWeight: 800 }}>MODE HORS LIGNE</div>
          <div style={{ fontSize: 11, color: '#555' }}>Tes séries sont sauvegardées localement et sync au retour réseau</div>
        </div>
        {pendingSync > 0 && <div style={{ fontSize: 11, color: '#ff6666', fontWeight: 700 }}>{pendingSync} en attente</div>}
      </div>
    )}
    {!isOffline && pendingSync > 0 && (
      <div style={{ margin: '0 20px 10px', background: ACCENT + '11', border: '1px solid ' + ACCENT + '33', borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 16 }}>🔄</span>
        <div style={{ fontSize: 11, color: ACCENT, fontWeight: 700 }}>Synchronisation en cours... {pendingSync} séries en attente</div>
      </div>
    )}

    {/* Comeback Mode Banner */}
    {comebackMode && (
      <div style={{ margin: '0 20px 12px', background: '#ffaa0011', border: '1px solid #ffaa0033', borderRadius: 14, padding: '12px 16px' }}>
        <div style={{ fontSize: 11, color: '#ffaa00', fontWeight: 800, marginBottom: 4 }}>🔥 COMEBACK MODE</div>
        <div style={{ fontSize: 12, color: '#888' }}>Reprise après une pause — charges réduites de 20% recommandées pour les 2 premières séances.</div>
        <button onClick={() => setComebackMode(false)} style={{ marginTop: 8, background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 11 }}>Ignorer</button>
      </div>
    )}

    {/* PR Banner */}
    {newPR && (
      <div style={{ margin: '0 20px 12px', background: ACCENT, borderRadius: 13, padding: '12px 15px', textAlign: 'center', animation: 'fadeIn .3s', color: '#111' }}>
        <div style={{ fontSize: 14, fontWeight: 1000 }}>NOUVEAU RECORD</div>
        <div style={{ fontSize: 11.5, marginTop: 3 }}>{newPR.name} — {newPR.weight} kg × {newPR.reps}</div>
      </div>
    )}

    {/* Progressive Overload suggestion */}
    {overloadSuggestion && !resting && (
      <div style={{ margin: '0 20px 12px', background: '#F8FFE4', border: `1px solid ${ACCENT}`, borderRadius: 13, padding: '11px 13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 9.5, color: '#111', fontWeight: 1000, textTransform: 'uppercase', letterSpacing: '.07em' }}>PROGRESSION NOX</div>
          <div style={{ fontSize: 11, color: '#66665F', marginTop: 4 }}>{overloadSuggestion.reason}</div>
        </div>
        <div style={{ fontSize: 18, fontWeight: 1000, color: '#111', flexShrink: 0, marginLeft: 12 }}>{overloadSuggestion.suggestedWeight} kg</div>
      </div>
    )}

    {resting ? (
      <RestScreen
        restTime={restTime}
        restMax={restMax}
        ex={ex}
        currentIdx={currentIdx}
        currentSet={currentSet}
        totalSets={totalSets}
        exercises={exercises}
        onAdd={() => setRestTime(t => t + 15)}
        onSkip={skipRest}
      />
    ) : (
      <div style={{ flex: 1, padding: '0 20px 28px', display: 'flex', flexDirection: 'column' }}>
        {/* Fiche exercice NOX — blanche, visuelle, sans mascotte. */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, color: '#8A8A83', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 7, fontWeight: 900 }}>EXERCICE {currentIdx + 1}</div>
          <div style={{ fontSize: 31, fontWeight: 1000, color: '#111', letterSpacing: '-.05em', lineHeight: .98 }}>{ex?.name}</div>
          <div style={{ fontSize: 13, color: '#74746D', lineHeight: 1.4, marginTop: 10, fontWeight: 650 }}>{exerciseCoachCopy(ex)}</div>
        </div>

        {/* Grande maquette de l'exercice. Le PLAY ouvre la démo guidée 1/3 → 3/3. */}
        <button onClick={() => setShowDemo(true)} aria-label={`Voir la démonstration de ${ex?.name || 'cet exercice'}`}
          style={{ width: '100%', border: '1px solid #E8EAE2', padding: 0, borderRadius: 28, overflow: 'hidden', background: '#FFFFFF', cursor: 'pointer', marginBottom: 12, textAlign: 'left', boxShadow: '0 12px 32px rgba(0,0,0,.06)' }}>
          <NoxExerciseCover exercise={ex} tags={tags} />
          <div style={{ padding: '14px 16px 15px', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 1000, color: '#111' }}>Voir la démonstration</div>
              <div style={{ marginTop: 3, fontSize: 10.5, color: '#77776F', fontWeight: 750 }}>3 étapes · placement · mouvement · retour</div>
            </div>
            <div style={{ color: '#111', fontSize: 21, fontWeight: 1000 }}>→</div>
          </div>
        </button>
            <button onClick={() => setShowNotes(true)}
              style={{ flexShrink: 0, padding: '8px 14px', background: '#FFFFFF', border: '1px solid ' + BORDER, borderRadius: 12, color: exerciseNotes[currentExercise?.name || ''] ? '#090909' : '#777B72', fontSize: 11, fontWeight: 800, cursor: 'pointer', touchAction: 'manipulation' as const }}>
              📝 {exerciseNotes[currentExercise?.name || ''] ? 'Note ✓' : 'Notes'}
            </button>

        {tags.length > 0 && <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 15 }}>
          {tags.map((tag, i) => <span key={tag} style={{ padding: '7px 11px', background: i === 0 ? '#F3FFE1' : '#F1F1EE', border: i === 0 ? `1px solid ${ACCENT}` : '1px solid transparent', borderRadius: 999, color: '#55554F', fontSize: 10.5, fontWeight: 800 }}>{tag}</span>)}
        </div>}

        <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '14px 16px', borderRadius: 20, background: '#F7FFE5', marginBottom: 17 }}>
          <div style={{ width: 42, height: 42, borderRadius: 14, background: ACCENT, display: 'grid', placeItems: 'center', fontSize: 20 }}>🎯</div>
          <div><div style={{ fontSize: 9.5, color: '#999991', fontWeight: 950, letterSpacing: '.07em' }}>OBJECTIF DU JOUR</div>
          <div style={{ fontSize: 19, color: '#111', fontWeight: 1000, marginTop: 2 }}>{ex?.reps || '8–12'} répétitions</div></div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 17 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 17, color: '#111' }}>
            <span>Série <b>{currentSet}</b> / {totalSets}</span>
            <span style={{ color: '#B7B7B0' }}>·</span>
            <span style={{ display: 'flex', gap: 6 }}>{Array.from({ length: totalSets }).map((_, i) => <i key={i} style={{ width: 14, height: 14, borderRadius: '50%', background: i < currentSet ? ACCENT : '#EDEDEA', display: 'block' }} />)}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#F7FFE5', display: 'grid', placeItems: 'center' }}>🏆</div>
            <div><div style={{ fontSize: 10.5, fontWeight: 950 }}>Tu avances bien !</div><div style={{ fontSize: 9.5, color: '#999' }}>Reste concentré.</div></div>
          </div>
        </div>

        <LastPerformances exerciseName={ex?.name} userId={user?.id} workoutId={workoutId} completedSets={completedSets.filter(s => s.exercise_name === ex?.name)} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <NumberField label="CHARGE (KG)" value={weight} onChange={setWeight} mode="decimal" step={2.5} />
          <NumberField label="RÉPÉTITIONS" value={reps} onChange={setReps} mode="numeric" step={1} />
        </div>

        <button onClick={() => setWeight(weight === '0' ? '' : '0')} style={{ background: 'transparent', border: 'none', color: weight === '0' ? '#111' : '#77776F', fontSize: 11.5, cursor: 'pointer', marginBottom: 15, textAlign: 'left', padding: '2px 0', fontWeight: weight === '0' ? 850 : 600 }}>
          <span style={{ color: weight === '0' ? ACCENT : '#AAA', fontWeight: 1000 }}>{weight === '0' ? '●' : '○'}</span>{' '}Poids du corps / Sans charge
        </button>

        <button onClick={validateSet} disabled={!weight || !reps || savingSet}
          style={{ width: '100%', padding: 18, background: weight && reps && !savingSet ? ACCENT : '#EFEFEC', border: 'none', borderRadius: 18, color: weight && reps && !savingSet ? '#111' : '#B6B6AF', fontWeight: 1000, fontSize: 15, cursor: weight && reps && !savingSet ? 'pointer' : 'not-allowed', marginBottom: 14 }}>
          {savingSet ? 'ENREGISTREMENT...' : 'VALIDER LA SÉRIE ✓'}
        </button>

        {currentIdx < exercises.length - 1 && <div style={{ padding: '15px 16px', background: '#fff', borderRadius: 18, border: '1px solid #E7E7E2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div><div style={{ fontSize: 9, color: '#A0A099', textTransform: 'uppercase', letterSpacing: '.09em', marginBottom: 5, fontWeight: 900 }}>PROCHAIN EXERCICE</div>
          <div style={{ fontSize: 14, color: '#111', fontWeight: 900 }}>{exercises[currentIdx + 1]?.name}</div></div><div style={{ fontSize: 26 }}>›</div>
        </div>}

        {showDemo && <DemoNox exercise={ex} tags={tags} onClose={() => setShowDemo(false)} />}
      </div>
    )}
  </main>

  <style>{`
    @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes spin { to { transform: rotate(360deg); } }
    input::-webkit-outer-spin-button,
    input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
    input[type=number] { -moz-appearance: textfield; }
  `}</style>
</div>

);
}
function NoxBrand({ compact = false }: { compact?: boolean }) {
return (
<div style={{ display: 'inline-flex', alignItems: 'center', gap: compact ? 6 : 8 }}>
<div style={{ position: 'relative', width: compact ? 23 : 28, height: compact ? 18 : 22, flexShrink: 0 }}>
<span style={{ position: 'absolute', width: compact ? 10 : 13, height: compact ? 6 : 7, left: 1, top: 2, borderRadius: 999, background: ACCENT, transform: 'rotate(28deg)' }} />
<span style={{ position: 'absolute', width: compact ? 18 : 22, height: compact ? 7 : 8, left: compact ? 6 : 7, top: compact ? 9 : 11, borderRadius: 999, background: ACCENT, transform: 'rotate(7deg)' }} />
</div>
<div style={{ display: 'flex', alignItems: 'baseline', gap: 4, color: '#111' }}>
<span style={{ fontSize: compact ? 14 : 17, fontWeight: 1000, letterSpacing: '-.045em' }}>NOX</span>
<span style={{ fontSize: compact ? 8 : 9.5, fontWeight: 900, letterSpacing: '.1em', color: '#66665F' }}>AI</span>
</div>
</div>
);
}
function NumberField({
  label, value, onChange, mode, step = 1,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  mode: 'decimal' | 'numeric';
  step?: number;
}) {
  const numberValue = Number(String(value || '0').replace(',', '.')) || 0;
  const changeBy = (delta: number) => {
    const next = Math.max(0, numberValue + delta);
    onChange(mode === 'numeric' ? String(Math.round(next)) : String(Math.round(next * 10) / 10));
  };
  return (
    <div style={{ border: '1px solid #E8EAE2', borderRadius: 20, padding: '12px 10px 14px', background: '#fff' }}>
      <label style={{ fontSize: 9.5, color: '#77776F', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 10, fontWeight: 900 }}>{label}</label>
      <div style={{ display: 'grid', gridTemplateColumns: '42px 1fr 42px', alignItems: 'center', gap: 5 }}>
        <button type="button" onClick={() => changeBy(-step)} style={{ width: 42, height: 42, borderRadius: '50%', border: 0, background: '#F1F1F3', fontSize: 24, cursor: 'pointer' }}>−</button>
        <input type="number" value={value} onChange={e => onChange(e.target.value)} placeholder="0" inputMode={mode}
          style={{ width: '100%', border: 0, outline: 'none', background: 'transparent', color: '#111', fontSize: 31, fontWeight: 1000, textAlign: 'center', minWidth: 0 }} />
        <button type="button" onClick={() => changeBy(step)} style={{ width: 42, height: 42, borderRadius: '50%', border: 0, background: '#F1F1F3', fontSize: 24, cursor: 'pointer' }}>+</button>
      </div>
    </div>
  );
}

function exerciseCoachCopy(exercise: any): string {
  const nox = resolvedNoxExercise(exercise);
  const tips = nox ? getNoxExerciseCoachTips(nox.id) : [];
  return tips[0] || 'Chaque répétition compte. Reste propre et concentré. 💪';
}

function demoSteps(exercise: any): { title: string; cue: string }[] {
  const nox = resolvedNoxExercise(exercise);
  if (nox) return getNoxExerciseSteps(nox.id);
  return [
    { title: 'Position de départ', cue: 'Place-toi de façon stable et contrôlée.' },
    { title: 'Mouvement', cue: 'Effectue la répétition sans élan.' },
    { title: 'Position finale', cue: 'Termine proprement puis reviens sous contrôle.' },
  ];
}

function NoxExerciseImage({
  src,
  alt,
  height,
  fallbackLabel = 'DÉMO NOX',
}: {
  src: string;
  alt: string;
  height: number;
  fallbackLabel?: string;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return <NoxVisualFallback height={height} label={fallbackLabel} />;
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      style={{ width: '100%', height, objectFit: 'contain', objectPosition: 'center', display: 'block', background: '#FFFFFF' }}
    />
  );
}

function NoxVisualFallback({ height = 150, label = 'VISUEL PÉDAGOGIQUE' }: { height?: number; label?: string }) {
  return (
    <div style={{ height, display: 'grid', placeItems: 'center', background: '#FFFFFF', color: '#111', border: '1px solid #ECECE7' }}>
      <div style={{ textAlign: 'center', padding: 24 }}>
        <div style={{ width: 56, height: 56, borderRadius: 20, background: '#F2FFD8', border: `1px solid ${ACCENT}`, display: 'grid', placeItems: 'center', margin: '0 auto 12px', fontSize: 24, fontWeight: 1000 }}>N</div>
        <div style={{ fontSize: 10, fontWeight: 1000, letterSpacing: '.11em', color: '#77776F' }}>{label}</div>
      </div>
    </div>
  );
}

function NoxExerciseCover({ exercise, tags }: { exercise: any; tags: string[] }) {
  const nox = resolvedNoxExercise(exercise);
  const equipment = nox?.equipment || exercise?.equipment || 'Exercice';
  const hdVisual = getNoxExerciseHdCover(nox?.id) || '';

  return (
    <div style={{ position: 'relative', background: '#FFFFFF', borderBottom: '1px solid #ECECE7', overflow: 'hidden', padding: '14px 14px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 9.5, color: '#8A8A83', fontWeight: 950, textTransform: 'uppercase', letterSpacing: '.08em' }}>MOUVEMENT</span>
        <span style={{ background: '#F5F5F2', borderRadius: 999, padding: '6px 10px', fontSize: 9, color: '#74746D', fontWeight: 900, textTransform: 'uppercase' }}>{equipment}</span>
      </div>

      <div style={{ position: 'relative', width: '100%', aspectRatio: '4 / 3', maxHeight: 390, minHeight: 235, display: 'grid', placeItems: 'center', background: '#FFFFFF', overflow: 'hidden' }}>
        {hdVisual ? (
          <NoxExerciseImage
            src={hdVisual}
            alt={nox?.name || exercise?.name || 'Exercice'}
            height={Math.min(390, typeof window !== 'undefined' ? window.innerWidth * 0.72 : 360)}
            fallbackLabel="DÉMO NOX"
          />
        ) : (
          <div style={{ width: '72%', maxWidth: 280, aspectRatio: '1.35 / 1', borderRadius: 28, background: 'linear-gradient(145deg,#FBFBF8,#F2F2ED)', border: '1px solid #ECECE7', display: 'grid', placeItems: 'center' }}>
            <div style={{ width: 70, height: 70, borderRadius: '50%', background: ACCENT, display: 'grid', placeItems: 'center', fontSize: 25, fontWeight: 1000 }}>▶</div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
        {tags.slice(0, 3).map((tag, index) => <span key={tag} style={{ padding: '6px 9px', borderRadius: 999, background: index === 0 ? '#F2FFD8' : '#F3F3F0', border: index === 0 ? `1px solid ${ACCENT}` : '1px solid transparent', fontSize: 9.5, fontWeight: 900 }}>{tag}</span>)}
      </div>
    </div>
  );
}

function NoxStepVisual({
  image,
  exerciseName,
  stepIndex,
  stepTitle,
  primaryMuscles,
}: {
  image?: string;
  exerciseName: string;
  stepIndex: number;
  stepTitle: string;
  primaryMuscles: string[];
}) {
  if (image) {
    return (
      <div style={{ position: 'relative', width: '100%', aspectRatio: '4 / 3', maxHeight: 430, background: '#FFFFFF' }}>
        <NoxExerciseImage src={image} alt={`${exerciseName} — ${stepTitle}`} height={Math.min(430, typeof window !== 'undefined' ? window.innerWidth * 0.72 : 390)} fallbackLabel={`ÉTAPE ${stepIndex + 1}`} />
        <div style={{ position: 'absolute', left: 14, bottom: 14, display: 'flex', gap: 7, flexWrap: 'wrap', maxWidth: 'calc(100% - 28px)' }}>
          {primaryMuscles.slice(0, 3).map(name => <span key={name} style={{ background: ACCENT, color: '#111', borderRadius: 999, padding: '7px 10px', fontSize: 9.5, fontWeight: 1000 }}>{name}</span>)}
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: 390, background: '#FFFFFF', display: 'grid', placeItems: 'center', padding: 26 }}>
      <div style={{ width: '100%', maxWidth: 330, textAlign: 'center' }}>
        <div style={{ width: 78, height: 78, margin: '0 auto 22px', borderRadius: 26, background: '#F2FFD8', border: `1px solid ${ACCENT}`, display: 'grid', placeItems: 'center', fontSize: 30, fontWeight: 1000 }}>{stepIndex + 1}</div>
        <div style={{ fontSize: 12, fontWeight: 1000, letterSpacing: '.1em', color: '#111', textTransform: 'uppercase' }}>{stepTitle}</div>
        <div style={{ width: 118, height: 3, borderRadius: 999, background: ACCENT, margin: '18px auto' }} />
        <div style={{ fontSize: 11, lineHeight: 1.5, color: '#77776F' }}>Suis la consigne ci-dessus et garde le mouvement contrôlé.</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, flexWrap: 'wrap', marginTop: 20 }}>
          {primaryMuscles.slice(0, 3).map(name => <span key={name} style={{ background: '#F2FFD8', border: `1px solid ${ACCENT}`, borderRadius: 999, padding: '7px 10px', fontSize: 9.5, fontWeight: 1000 }}>{name}</span>)}
        </div>
      </div>
    </div>
  );
}

function DemoNox({ exercise, tags, onClose }: { exercise: any; tags: string[]; onClose: () => void }) {
  const nox = resolvedNoxExercise(exercise);
  const steps = demoSteps(exercise).slice(0, 3);
  const coachTips = nox ? getNoxExerciseCoachTips(nox.id) : steps.map(step => step.cue);
  const muscleData = nox ? getNoxExerciseMuscles(nox.id) : { primary: tags, secondary: [], stabilizers: [] };
  const anatomyImage = nox ? getNoxExerciseAnatomyImage(nox.id) : null;
  const mistakes = nox
    ? getNoxExerciseMistakes(nox.id).map(item => [item.title, item.correction] as [string, string])
    : [
        ['Mouvement trop rapide', 'Ralentis la phase de descente et garde le contrôle.'],
        ['Perte de posture', 'Reste gainé du début à la fin du mouvement.'],
        ['Charge trop lourde', 'Réduis la charge si la technique se dégrade.'],
      ];
  const variants = nox ? getNoxExerciseVariants(nox.id) : [];
  const displayName = nox?.name || exercise?.name || 'Exercice';
  const [activeStep, setActiveStep] = useState(0);
  const currentStep = steps[activeStep] || steps[0];

  // Architecture HD commune aux 152 exercices.
  // Une phase absente déclenche le fallback blanc de NoxExerciseImage :
  // aucune ancienne miniature n'est agrandie ou recyclée.
  const stepImages: Array<string | undefined> = getNoxExerciseHdPositions(nox?.id);
  const currentImage = stepImages[activeStep];

  const muscleRows = [
    ...muscleData.primary.map(name => ({ name, level: 0 })),
    ...muscleData.secondary.map(name => ({ name, level: 1 })),
    ...muscleData.stabilizers.map(name => ({ name, level: 2 })),
  ].filter((item, index, all) => all.findIndex(other => other.name === item.name) === index).slice(0, 6);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: '#FFFFFF', overflowY: 'auto', color: '#111' }}>
      <div style={{ width: '100%', maxWidth: 620, margin: '0 auto', padding: '16px 16px 34px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '42px 1fr 42px', alignItems: 'center', marginBottom: 18 }}>
          <button onClick={onClose} aria-label="Fermer" style={{ width: 40, height: 40, borderRadius: '50%', border: '1px solid #E7E7E2', background: '#FFFFFF', fontSize: 25, cursor: 'pointer', display: 'grid', placeItems: 'center' }}>×</button>
          <div style={{ textAlign: 'center', minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 1000, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</div>
            <div style={{ fontSize: 9.5, color: '#8A8A83', fontWeight: 900, letterSpacing: '.1em', marginTop: 3 }}>DÉMO NOX</div>
          </div>
          <div style={{ textAlign: 'right', fontSize: 12, fontWeight: 1000 }}>{activeStep + 1} / 3</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 7, alignItems: 'center', marginBottom: 22 }}>
          {steps.map((_, index) => (
            <button key={index} type="button" onClick={() => setActiveStep(index)} aria-label={`Étape ${index + 1}`}
              style={{ height: 6, border: 'none', borderRadius: 999, background: index <= activeStep ? ACCENT : '#E9E9E5', cursor: 'pointer', padding: 0 }} />
          ))}
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, color: '#8A8A83', fontWeight: 1000, letterSpacing: '.09em', textTransform: 'uppercase' }}>ÉTAPE {activeStep + 1}</div>
          <div style={{ fontSize: 27, fontWeight: 1000, letterSpacing: '-.04em', lineHeight: 1.02, marginTop: 6 }}>{currentStep?.title || 'Mouvement'}</div>
          <div style={{ fontSize: 13, color: '#66665F', lineHeight: 1.5, marginTop: 9 }}>{currentStep?.cue}</div>
        </div>

        <div style={{ borderRadius: 28, overflow: 'hidden', border: '1px solid #E7E7E2', background: '#FFFFFF', marginBottom: 12 }}>
          <NoxStepVisual
            image={currentImage}
            exerciseName={displayName}
            stepIndex={activeStep}
            stepTitle={currentStep?.title || `Étape ${activeStep + 1}`}
            primaryMuscles={muscleData.primary}
          />
        </div>

        <div style={{ background: '#F7FFE7', border: `1px solid ${ACCENT}`, borderRadius: 20, padding: '13px 14px', marginBottom: 14, display: 'grid', gridTemplateColumns: '34px 1fr', gap: 10, alignItems: 'start' }}>
          <div style={{ width: 34, height: 34, borderRadius: 11, background: ACCENT, display: 'grid', placeItems: 'center', fontWeight: 1000 }}>N</div>
          <div><div style={{ fontSize: 9.5, fontWeight: 1000, letterSpacing: '.08em' }}>CONSEIL NOX</div><div style={{ fontSize: 11.5, lineHeight: 1.45, color: '#55554F', marginTop: 4 }}>{coachTips[activeStep] || coachTips[0] || currentStep?.cue}</div></div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginBottom: 18 }}>
          <button type="button" disabled={activeStep === 0} onClick={() => setActiveStep(step => Math.max(0, step - 1))}
            style={{ minHeight: 56, borderRadius: 18, border: '1px solid #E2E2DD', background: '#FFFFFF', color: activeStep === 0 ? '#B7B7B0' : '#111', fontWeight: 1000, cursor: activeStep === 0 ? 'not-allowed' : 'pointer' }}>← PRÉCÉDENT</button>
          {activeStep < 2
            ? <button type="button" onClick={() => setActiveStep(step => Math.min(2, step + 1))}
                style={{ minHeight: 56, borderRadius: 18, border: 'none', background: ACCENT, color: '#111', fontWeight: 1000, cursor: 'pointer' }}>SUIVANT →</button>
            : <button type="button" onClick={onClose}
                style={{ minHeight: 56, borderRadius: 18, border: 'none', background: ACCENT, color: '#111', fontWeight: 1000, cursor: 'pointer' }}>J’AI COMPRIS ✓</button>}
        </div>

        {activeStep === 2 && (
          <div style={{ animation: 'fadeIn .25s ease' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginBottom: 10 }}>
              <div style={{ background: '#F7FFE7', borderRadius: 20, padding: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 1000, marginBottom: 10 }}>CONSEILS</div>
                {coachTips.slice(0, 4).map(tip => <div key={tip} style={{ display: 'grid', gridTemplateColumns: '20px 1fr', gap: 7, marginTop: 8 }}><span style={{ width: 20, height: 20, borderRadius: '50%', background: ACCENT, display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 1000 }}>✓</span><span style={{ fontSize: 9.8, lineHeight: 1.4, color: '#44443F' }}>{tip}</span></div>)}
              </div>
              <div style={{ background: '#F7F7F5', borderRadius: 20, padding: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 1000, marginBottom: 9 }}>MUSCLES</div>
                {anatomyImage && <img src={anatomyImage} alt={`Anatomie ${displayName}`} style={{ width: '100%', height: 125, objectFit: 'cover', borderRadius: 14, display: 'block', marginBottom: 9 }} />}
                {muscleRows.map(({ name, level }) => <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 7, fontSize: 10, fontWeight: 850 }}><span style={{ width: 10, height: 10, borderRadius: '50%', background: level === 0 ? ACCENT : level === 1 ? '#D9FF8C' : '#C8C8C2' }} />{name}</div>)}
              </div>
            </div>

            <div style={{ background: '#FFF7F2', borderRadius: 20, padding: 14, marginBottom: 10 }}>
              <div style={{ color: '#D84A1B', fontSize: 12, fontWeight: 1000, marginBottom: 9 }}>ERREURS FRÉQUENTES</div>
              {mistakes.slice(0, 4).map(([title, correction]) => <div key={title} style={{ background: '#FFFFFF', borderRadius: 14, padding: '10px 11px', marginTop: 7 }}><div style={{ fontSize: 10.5, fontWeight: 1000 }}>✕ {title}</div><div style={{ fontSize: 9.5, lineHeight: 1.4, color: '#77776F', marginTop: 3 }}>{correction}</div></div>)}
            </div>

            {variants.length > 0 && <div style={{ background: '#F7F7F5', borderRadius: 20, padding: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 1000, marginBottom: 9 }}>VARIANTES</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>{variants.map(variant => <span key={variant} style={{ background: '#FFFFFF', border: '1px solid #E7E7E2', borderRadius: 999, padding: '7px 10px', fontSize: 9.5, fontWeight: 850 }}>{variant}</span>)}</div>
            </div>}
          </div>
        )}
      </div>
    </div>
  );
}

function RestScreen({
restTime,
restMax,
ex,
currentIdx,
currentSet,
totalSets,
exercises,
onAdd,
onSkip,
}: any) {
const radius = 72;
const circumference = 2 * Math.PI * radius;
const ratio = restMax > 0 ? Math.min(1, Math.max(0, restTime / restMax)) : 0;
const nextLabel =
currentSet <= totalSets
? `${ex?.name} — Série ${currentSet}`
: currentIdx < exercises.length - 1
? exercises[currentIdx + 1]?.name
: ex?.name;
return (
<div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '34px 28px 70px', textAlign: 'center' }}>
<div style={{ fontSize: 13, color: '#656565', textTransform: 'uppercase', letterSpacing: '.14em', marginBottom: 20, fontWeight: 700 }}>REPOS</div>

  <div style={{ position: 'relative', width: 180, height: 180, marginBottom: 34 }}>
    <svg width="180" height="180" viewBox="0 0 180 180" style={{ transform: 'rotate(-90deg)' }}>
      <circle cx="90" cy="90" r={radius} fill="none" stroke="#1C1C1C" strokeWidth="9" />
      <circle
        cx="90" cy="90" r={radius} fill="none" stroke={ACCENT} strokeWidth="9"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - ratio)}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 1s linear' }}
      />
    </svg>
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: 52, fontWeight: 1000, color: '#fff', lineHeight: .9, letterSpacing: '-.04em' }}>{restTime}</div>
      <div style={{ fontSize: 12, color: '#656565', marginTop: 10 }}>secondes</div>
    </div>
  </div>

  <div style={{ fontSize: 13.5, color: '#666', marginBottom: 7 }}>
    Prochain : <span style={{ color: '#fff', fontWeight: 900 }}>{nextLabel}</span>
  </div>

  <div style={{ display: 'grid', gridTemplateColumns: '116px minmax(150px, 1fr)', gap: 12, width: '100%', maxWidth: 330, marginTop: 26 }}>
    <button onClick={onAdd}
      style={{ minHeight: 54, background: '#121212', border: '1px solid #252525', borderRadius: 14, color: '#fff', fontWeight: 900, fontSize: 14, cursor: 'pointer' }}>
      +15s
    </button>
    <button onClick={onSkip}
      style={{ minHeight: 54, background: ACCENT, border: 'none', borderRadius: 14, color: '#111', fontWeight: 1000, fontSize: 14, cursor: 'pointer' }}>
      PASSER ▶
    </button>
  </div>

  <div style={{ width: '100%', maxWidth: 330, marginTop: 16, padding: '13px 14px', borderRadius: 14, border: '1px solid #242424', background: '#111', display: 'grid', gridTemplateColumns: '30px 1fr', gap: 10, textAlign: 'left' }}>
    <div style={{ width: 28, height: 28, borderRadius: 9, background: ACCENT, color: '#111', display: 'grid', placeItems: 'center', fontWeight: 1000 }}>N</div>
    <div><div style={{ fontSize: 10.5, color: '#fff', fontWeight: 900 }}>Conseil NOX</div><div style={{ fontSize: 10, color: '#777', lineHeight: 1.4, marginTop: 3 }}>Respire, hydrate-toi et prépare ta prochaine série.</div></div>
  </div>
</div>

);
}
function DoneMetric({ label, value, symbol }: { label: string; value: string; symbol: string }) {
return (
<div style={{ background: '#FAFAF8', border: '1px solid #E7E7E2', borderRadius: 13, padding: '13px 7px' }}>
<div style={{ color: ACCENT, fontSize: 19, fontWeight: 1000 }}>{symbol}</div>
<div style={{ fontSize: 17, fontWeight: 1000, color: '#111', marginTop: 4 }}>{value}</div>
<div style={{ fontSize: 8.5, color: '#77776F', textTransform: 'uppercase', marginTop: 3, fontWeight: 800 }}>{label}</div>
</div>
);
}
// ─── LAST PERFORMANCES ──────────────────────────────────────────
function LastPerformances({ exerciseName, userId, workoutId, completedSets }: any) {
const [history, setHistory] = useState<any[]>([]);
const [lastSets, setLastSets] = useState<any[]>([]);
useEffect(() => {
if (!exerciseName || !userId) return;

let cancelled = false;

const load = async () => {
  const [prResult, setsResult] = await Promise.all([
    supabase
      .from('personal_records')
      .select('weight, reps, created_at')
      .eq('user_id', userId)
      .eq('exercise_name', exerciseName)
      .order('created_at', { ascending: false })
      .limit(1),
    (() => {
      let query = supabase
        .from('workout_sets')
        .select('workout_id, weight, reps, set_number, created_at')
        .eq('user_id', userId)
        .eq('exercise_name', exerciseName);

      if (workoutId) query = query.neq('workout_id', workoutId);

      return query
        .order('created_at', { ascending: false })
        .limit(20);
    })(),
  ]);

  if (cancelled) return;

  setHistory(prResult.data || []);

  if (!setsResult.error && Array.isArray(setsResult.data)) {
    const rows = setsResult.data;
    const latestWorkoutId = rows[0]?.workout_id;
    setLastSets(
      latestWorkoutId
        ? rows
            .filter((row: any) => row.workout_id === latestWorkoutId)
            .sort((a: any, b: any) => Number(a.set_number) - Number(b.set_number))
        : [],
    );
  } else {
    setLastSets([]);
  }
};

void load();

return () => {
  cancelled = true;
};

}, [exerciseName, userId, workoutId]);
if (history.length === 0 && lastSets.length === 0 && completedSets.length === 0) return null;
return (
<div style={{ background: '#FAFAF8', border: '1px solid #E7E7E2', borderRadius: 12, padding: '10px 12px', marginBottom: 14 }}>
{lastSets.length > 0 && (
<div style={{ marginBottom: history.length > 0 || completedSets.length > 0 ? 8 : 0 }}>
<div style={{ fontSize: 8.5, color: '#999991', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 5, fontWeight: 850 }}>DERNIÈRE SÉANCE</div>
<div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
{lastSets.map((s: any, i: number) => (
<div key={i} style={{ background: '#EEEEEA', borderRadius: 7, padding: '4px 8px', fontSize: 10.5, color: '#44443F', fontWeight: 750 }}>
{s.weight} kg × {s.reps}
</div>
))}
</div>
</div>
)}

  {history[0] && (
    <div style={{ marginBottom: completedSets.length > 0 ? 8 : 0 }}>
      <div style={{ fontSize: 8.5, color: '#999991', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4, fontWeight: 850 }}>MEILLEUR PR</div>
      <div style={{ fontSize: 12.5, fontWeight: 900, color: '#111' }}>
        {history[0].weight} kg × {history[0].reps} reps
      </div>
    </div>
  )}

  {completedSets.length > 0 && (
    <div>
      <div style={{ fontSize: 8.5, color: '#999991', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 5, fontWeight: 850 }}>CETTE SÉANCE</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {completedSets.map((s: any, i: number) => (
          <div key={i} style={{ background: '#EEEEEA', borderRadius: 7, padding: '4px 8px', fontSize: 10.5, color: '#44443F', fontWeight: 750 }}>
            {s.weight} kg × {s.reps}
          </div>
        ))}
      </div>
    </div>
  )}
</div>

);
}
