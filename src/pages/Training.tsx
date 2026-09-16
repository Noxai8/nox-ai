import { calculateProgressiveOverload, detectStagnation } from '../lib/noxBrain';
import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
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
const BG = '#070707';
const SURFACE = '#121212';
const BORDER = '#242424';
type VisualKey = 'bench' | 'squat' | 'row' | 'overhead' | 'pullup' | 'rdl' | 'plank';
type ExerciseMedia = { key: VisualKey; image: string; videoEmbed: string | null };
const EXERCISE_MEDIA: Record<VisualKey, ExerciseMedia> = {
squat: { key: 'squat', image: 'https://images.pexels.com/photos/17840/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=1200', videoEmbed: 'https://player.vimeo.com/video/919708638?h=8e305290c4&title=0&byline=0&portrait=0' },
bench: { key: 'bench', image: 'https://images.pexels.com/photos/13967665/pexels-photo-13967665.jpeg?auto=compress&cs=tinysrgb&w=1200', videoEmbed: 'https://player.vimeo.com/video/919705993?h=2583e706aa&title=0&byline=0&portrait=0' },
row: { key: 'row', image: 'https://images.pexels.com/photos/17210045/pexels-photo-17210045.jpeg?auto=compress&cs=tinysrgb&w=1200', videoEmbed: 'https://player.vimeo.com/video/919708991?h=dfda1026a9&title=0&byline=0&portrait=0' },
plank: { key: 'plank', image: 'https://images.pexels.com/photos/4944959/pexels-photo-4944959.jpeg?auto=compress&cs=tinysrgb&w=1200', videoEmbed: null },
rdl: { key: 'rdl', image: 'https://images.pexels.com/photos/15596431/pexels-photo-15596431.jpeg?auto=compress&cs=tinysrgb&w=1200', videoEmbed: 'https://player.vimeo.com/video/919712383?h=12a5576d3c&title=0&byline=0&portrait=0' },
pullup: { key: 'pullup', image: 'https://images.pexels.com/photos/7671462/pexels-photo-7671462.jpeg?auto=compress&cs=tinysrgb&w=1200', videoEmbed: null },
overhead: { key: 'overhead', image: 'https://images.pexels.com/photos/13106583/pexels-photo-13106583.jpeg?auto=compress&cs=tinysrgb&w=1200', videoEmbed: 'https://player.vimeo.com/video/919710922?h=e1d5aac320&title=0&byline=0&portrait=0' },
};
function normalizeExerciseName(name: string) {
return String(name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}
function exerciseVisualKey(name: string): VisualKey | null {
const n = normalizeExerciseName(name);
if (n.includes('developpe couche') || n.includes('bench press')) return 'bench';
if (n.includes('squat')) return 'squat';
if (n.includes('rowing') || n.includes('bent-over row') || n.includes('bent over row')) return 'row';
if (n.includes('gainage') || n.includes('plank')) return 'plank';
if (n.includes('souleve de terre roumain') || n.includes('romanian deadlift') || n.includes('rdl')) return 'rdl';
if (n.includes('traction') || n.includes('pull-up') || n.includes('pull up')) return 'pullup';
if (n.includes('developpe militaire') || n.includes('overhead press') || n.includes('shoulder press')) return 'overhead';
return null;
}
function resolveExerciseMedia(exercise: any): ExerciseMedia | null {
const key = exerciseVisualKey(exercise?.name || '');
return key ? EXERCISE_MEDIA[key] : null;
}
function muscleTags(exercise: any): string[] {
const raw = String(exercise?.muscles || '');
if (raw.trim()) return raw.split(/[·,/]/).map((x: string) => x.trim()).filter(Boolean).slice(0, 3);
const key = exerciseVisualKey(exercise?.name || '');
const tags: Record<VisualKey, string[]> = {
squat: ['Quadriceps','Fessiers','Ischios'], bench: ['Pectoraux','Triceps','Épaules'], row: ['Dos','Biceps'],
overhead: ['Épaules','Triceps'], pullup: ['Dos','Biceps'], rdl: ['Ischios','Fessiers','Dos'], plank: ['Core','Abdominaux']
};
return key ? tags[key] : [];
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
const media = resolveExerciseMedia(ex);
const tags = muscleTags(ex);
const totalSets = parseInt(ex?.sets) || 3;
const exerciseProgress = ((currentIdx + (currentSet - 1) / totalSets) / exercises.length) * 100;
return (
<div style={{
minHeight: '100vh',
background: resting ? '#070707' : '#F4F4F1',
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
background: resting ? '#070707' : '#FFFFFF',
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
        {/* Carte coach — volontairement compacte comme la maquette validée */}
        <div style={{ position: 'relative', minHeight: 178, border: '1px solid #E7E7E2', borderRadius: 24, padding: '22px 138px 20px 22px', marginBottom: 16, boxShadow: '0 8px 24px rgba(0,0,0,.055)', overflow: 'hidden' }}>
          <div style={{ fontSize: 10, color: '#8A8A83', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 8, fontWeight: 900 }}>EXERCICE {currentIdx + 1}</div>
          <div style={{ fontSize: 29, fontWeight: 1000, color: '#111', letterSpacing: '-.05em', lineHeight: .98 }}>{ex?.name}</div>
          <div style={{ fontSize: 14, color: '#74746D', lineHeight: 1.35, marginTop: 14, fontWeight: 650 }}>{exerciseCoachCopy(ex)}</div>
          <div style={{ position: 'absolute', right: 14, bottom: 15 }}><NoxMascot /></div>
          <div style={{ position: 'absolute', right: 12, top: 20, maxWidth: 118, background: '#F0FFD0', borderRadius: '18px 18px 18px 5px', padding: '9px 10px', fontSize: 9.5, fontWeight: 900, lineHeight: 1.15 }}>Chaque rep te rapproche de ton objectif !</div>
        </div>

        {/* Démo — le clic ouvre une démo NOX native, sans Vimeo */}
        <button onClick={() => setShowDemo(true)} aria-label={`Voir la démonstration de ${ex?.name || 'cet exercice'}`}
          style={{ position: 'relative', width: '100%', border: 0, padding: 0, borderRadius: 22, overflow: 'hidden', background: '#F0F0EC', cursor: 'pointer', marginBottom: 10, textAlign: 'left' }}>
          {media?.image ? <img src={media.image} alt="" style={{ width: '100%', height: 232, objectFit: 'cover', display: 'block' }} /> :
            <div style={{ height: 232, display: 'grid', placeItems: 'center', fontWeight: 1000, color: '#AAA' }}>NOX EXERCISE</div>}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,transparent 48%,rgba(0,0,0,.55))' }} />
          <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: 66, height: 66, borderRadius: '50%', background: '#fff', display: 'grid', placeItems: 'center', color: '#111', fontSize: 26, boxShadow: '0 8px 25px rgba(0,0,0,.18)' }}>▶</div>
          <div style={{ position: 'absolute', left: 14, bottom: 14, background: '#111', color: '#fff', borderRadius: 999, padding: '10px 14px', fontSize: 11.5, fontWeight: 950 }}>● &nbsp; VOIR LA DÉMO</div>
        </button>

        {tags.length > 0 && <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 15 }}>
          {tags.map(tag => <span key={tag} style={{ padding: '7px 11px', background: '#F1F1EE', borderRadius: 999, color: '#55554F', fontSize: 10.5, fontWeight: 800 }}>{tag}</span>)}
        </div>}

        <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '14px 16px', borderRadius: 20, background: '#F5FFE3', marginBottom: 17 }}>
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
            <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#F5FFE3', display: 'grid', placeItems: 'center' }}>🏆</div>
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
    <div style={{ border: '1.5px solid #E4E4DF', borderRadius: 18, padding: '12px 10px 14px', background: '#fff' }}>
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
  const key = exerciseVisualKey(exercise?.name || '');
  const copies: Partial<Record<VisualKey, string>> = {
    overhead: 'Des épaules plus fortes, un toi plus confiant. 💪',
    bench: 'Pousse fort, contrôle chaque répétition. 💪',
    squat: 'Solide sur tes appuis, puissant à la remontée. ⚡',
    row: 'Tire avec le dos, garde le mouvement propre. 🎯',
    pullup: 'Poitrine haute, contrôle du début à la fin. 🔥',
    rdl: 'Hanches en arrière, dos solide, ischios sous tension.',
    plank: 'Gainage fort, respiration calme, corps aligné.',
  };
  return copies[key || 'overhead'] || 'Chaque répétition compte. Reste propre et concentré. 💪';
}

function demoSteps(exercise: any): { title: string; cue: string }[] {
  const key = exerciseVisualKey(exercise?.name || '');
  const map: Partial<Record<VisualKey, { title: string; cue: string }[]>> = {
    overhead: [
      { title: 'Position de départ', cue: 'Haltères à hauteur des épaules, buste droit.' },
      { title: 'Presse vers le haut', cue: 'Monte verticalement sans cambrer le dos.' },
      { title: 'Bras tendus', cue: 'Termine au-dessus de la tête sans verrouiller.' },
    ],
    bench: [
      { title: 'Position de départ', cue: 'Omoplates serrées, pieds ancrés au sol.' },
      { title: 'Descente contrôlée', cue: 'Descends vers la poitrine avec contrôle.' },
      { title: 'Pousse', cue: 'Repousse la charge sans décoller les épaules.' },
    ],
    squat: [
      { title: 'Position de départ', cue: 'Pieds stables, poitrine haute.' },
      { title: 'Descends', cue: 'Hanches en arrière, genoux dans l’axe.' },
      { title: 'Remonte', cue: 'Pousse le sol et termine grand.' },
    ],
  };
  return map[key || 'overhead'] || [
    { title: 'Position de départ', cue: 'Place-toi de façon stable et contrôlée.' },
    { title: 'Mouvement', cue: 'Effectue la répétition sans élan.' },
    { title: 'Position finale', cue: 'Termine proprement puis reviens sous contrôle.' },
  ];
}

const OVERHEAD_DEMO_IMAGE = 'data:image/webp;base64,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';

function DemoNox({ exercise, tags, onClose }: { exercise: any; tags: string[]; onClose: () => void }) {
  const steps = demoSteps(exercise);
  const key = exerciseVisualKey(exercise?.name || '');
  const demoImage = key === 'overhead' ? OVERHEAD_DEMO_IMAGE : resolveExerciseMedia(exercise)?.image;
  const coachTips = key === 'overhead'
    ? [
        'Garde le dos bien droit.',
        'Ne cambre pas le bas du dos.',
        'Contrôle la descente.',
        'Respire : inspire en descendant, expire en montant.',
        'Mouvement fluide et contrôlé.',
      ]
    : steps.map(step => step.cue);

  return (
    <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, zIndex: 1000, background: '#FFFFFF', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <div style={{ width: '100%', maxWidth: 560, minHeight: '100dvh', margin: '0 auto', background: '#fff', padding: '22px 20px 34px', boxSizing: 'border-box' }}>
        <div style={{ position: 'relative', textAlign: 'center', padding: '4px 54px 18px' }}>
          <button onClick={onClose} aria-label="Fermer" style={{ position: 'absolute', right: 0, top: 0, width: 46, height: 46, border: 0, borderRadius: '50%', background: '#F1F1EF', color: '#111', fontSize: 30, lineHeight: 1, cursor: 'pointer' }}>×</button>
          <div style={{ fontSize: 24, fontWeight: 1000, letterSpacing: '-.045em', color: '#111' }}>DÉMO NOX</div>
          <div style={{ color: '#77776F', fontSize: 14, marginTop: 4, fontWeight: 600 }}>{exercise?.name}</div>
        </div>

        <div style={{ borderRadius: 24, overflow: 'hidden', background: '#FAFAF8', border: '1px solid #ECECE7', boxShadow: '0 10px 28px rgba(0,0,0,.05)', marginBottom: 18 }}>
          {demoImage ? (
            <img src={demoImage} alt={`Démonstration ${exercise?.name || 'exercice'}`} style={{ width: '100%', display: 'block', aspectRatio: '760 / 452', objectFit: 'cover' }} />
          ) : (
            <div style={{ minHeight: 260, display: 'grid', placeItems: 'center', color: '#77776F', fontWeight: 900 }}>DÉMONSTRATION NOX</div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20 }}>
          {steps.map((step, i) => (
            <div key={step.title} style={{ padding: '2px 3px', textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, display: 'grid', placeItems: 'center', background: i === 1 ? ACCENT : '#F0F0EE', color: '#111', fontSize: 15, fontWeight: 1000 }}>{i + 1}</div>
                <div style={{ fontSize: 10.5, lineHeight: 1.1, fontWeight: 950, color: '#111' }}>{step.title}</div>
              </div>
              <div style={{ fontSize: 9.5, lineHeight: 1.35, color: '#77776F', paddingLeft: 42 }}>{step.cue}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.08fr .92fr', gap: 10, marginBottom: 22 }}>
          <div style={{ background: '#F3FFE1', borderRadius: 22, padding: '16px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 1000, color: '#111', marginBottom: 12 }}><span style={{ color: '#5A8A00', fontSize: 18 }}>💡</span> CONSEILS COACH</div>
            {coachTips.map((tip, i) => (
              <div key={tip} style={{ display: 'grid', gridTemplateColumns: '24px 1fr', gap: 8, alignItems: 'start', marginTop: i ? 9 : 0 }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#5FD000', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 1000 }}>✓</div>
                <div style={{ fontSize: 10.5, lineHeight: 1.35, color: '#242424', paddingTop: 3 }}>{tip}</div>
              </div>
            ))}
          </div>

          <div style={{ background: '#F7F7F5', borderRadius: 22, padding: '16px 14px' }}>
            <div style={{ fontSize: 12, fontWeight: 1000, color: '#111', marginBottom: 13 }}>🏋️ &nbsp; MUSCLES SOLLICITÉS</div>
            <div style={{ height: 120, borderRadius: 16, background: 'linear-gradient(180deg,#fff,#EFEFEC)', display: 'grid', placeItems: 'center', marginBottom: 12, position: 'relative', overflow: 'hidden' }}>
              <div style={{ width: 70, height: 94, position: 'relative' }}>
                <div style={{ position: 'absolute', left: 25, top: 4, width: 20, height: 20, borderRadius: '50%', background: '#CFCFCA' }} />
                <div style={{ position: 'absolute', left: 17, top: 25, width: 36, height: 50, borderRadius: '16px 16px 12px 12px', background: '#DADAD6' }} />
                <div style={{ position: 'absolute', left: 7, top: 28, width: 18, height: 18, borderRadius: '50%', background: ACCENT }} />
                <div style={{ position: 'absolute', right: 7, top: 28, width: 18, height: 18, borderRadius: '50%', background: ACCENT }} />
                <div style={{ position: 'absolute', left: 20, bottom: 0, width: 10, height: 44, borderRadius: 8, background: '#CFCFCA' }} />
                <div style={{ position: 'absolute', right: 20, bottom: 0, width: 10, height: 44, borderRadius: 8, background: '#CFCFCA' }} />
              </div>
            </div>
            {tags.slice(0, 3).map((tag, i) => (
              <div key={tag} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: i ? 9 : 0, fontSize: 10.5, fontWeight: 800, color: '#333' }}>
                <span style={{ width: 12, height: 12, borderRadius: '50%', background: i === 0 ? ACCENT : '#CFCFCA', flexShrink: 0 }} />{tag}
              </div>
            ))}
          </div>
        </div>

        <button onClick={onClose} style={{ width: '100%', border: 0, borderRadius: 20, background: ACCENT, padding: '19px 18px', color: '#111', fontSize: 17, fontWeight: 1000, cursor: 'pointer', boxShadow: '0 10px 28px rgba(183,255,0,.25)' }}>J’AI COMPRIS ! →</button>
      </div>
    </div>
  );
}

function NoxMascot() {
  return <div aria-hidden="true" style={{ width: 104, height: 116, position: 'relative' }}>
    <div style={{ position: 'absolute', left: 21, top: 18, width: 64, height: 55, borderRadius: 23, background: '#111' }}>
      <i style={{ position: 'absolute', left: 18, top: 22, width: 11, height: 6, borderRadius: 9, background: ACCENT }} />
      <i style={{ position: 'absolute', right: 18, top: 22, width: 11, height: 6, borderRadius: 9, background: ACCENT }} />
      <i style={{ position: 'absolute', left: 27, top: 36, width: 13, height: 5, borderRadius: 9, background: ACCENT }} />
    </div>
    <div style={{ position: 'absolute', left: 28, top: 68, width: 50, height: 43, borderRadius: '8px 8px 18px 18px', background: '#111', color: ACCENT, display: 'grid', placeItems: 'center', fontWeight: 1000, fontSize: 24 }}>N</div>
    <div style={{ position: 'absolute', left: 11, top: 69, width: 27, height: 10, borderRadius: 10, background: '#111', transform: 'rotate(-28deg)' }} />
    <div style={{ position: 'absolute', right: 9, top: 69, width: 27, height: 10, borderRadius: 10, background: '#111', transform: 'rotate(28deg)' }} />
  </div>;
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
