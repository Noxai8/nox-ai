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

function DemoFigure({ phase, exercise }: { phase: number; exercise: any }) {
  const key = exerciseVisualKey(exercise?.name || '');
  const isPress = key === 'overhead';
  return (
    <div style={{ position: 'relative', width: 118, height: 190, margin: '0 auto' }}>
      <div style={{ position: 'absolute', left: 47, top: 12, width: 25, height: 25, borderRadius: '50%', background: '#D7D7D3', border: '2px solid #A9A9A4' }} />
      <div style={{ position: 'absolute', left: 43, top: 40, width: 33, height: 72, borderRadius: 18, background: '#E7E7E3', border: '2px solid #B5B5B0' }}>
        <div style={{ position: 'absolute', left: -5, top: 9, width: 43, height: 28, borderRadius: 16, background: 'rgba(183,255,0,.72)' }} />
      </div>
      {[0,1].map(side => {
        const left = side === 0 ? 24 : 78;
        const raised = isPress && phase > 0;
        return <div key={side}>
          <div style={{ position: 'absolute', left, top: raised ? 35 : 57, width: 13, height: 65, borderRadius: 8, background: '#D5D5D1', transformOrigin: '50% 10%', transform: raised ? `rotate(${side ? -7 : 7}deg)` : `rotate(${side ? -28 : 28}deg)` }} />
          <div style={{ position: 'absolute', left: left - 7, top: raised ? 18 : 52, width: 28, height: 13, borderRadius: 5, background: '#222' }} />
        </div>;
      })}
      <div style={{ position: 'absolute', left: 40, top: 105, width: 14, height: 67, borderRadius: 8, background: '#D0D0CC', transform: 'rotate(5deg)' }} />
      <div style={{ position: 'absolute', left: 65, top: 105, width: 14, height: 67, borderRadius: 8, background: '#D0D0CC', transform: 'rotate(-5deg)' }} />
      <div style={{ position: 'absolute', left: 24, bottom: 13, width: 70, height: 9, borderRadius: 8, background: '#333' }} />
    </div>
  );
}

function DemoNox({ exercise, tags, onClose }: { exercise: any; tags: string[]; onClose: () => void }) {
  const [phase, setPhase] = useState(0);
  const steps = demoSteps(exercise);
  useEffect(() => {
    const id = window.setInterval(() => setPhase(p => (p + 1) % 3), 1100);
    return () => window.clearInterval(id);
  }, []);
  return (
    <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,.30)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 560, maxHeight: '94dvh', overflowY: 'auto', background: '#fff', borderRadius: '32px 32px 0 0', padding: '18px 20px 28px', boxShadow: '0 -20px 60px rgba(0,0,0,.18)' }}>
        <div style={{ position: 'sticky', top: -18, zIndex: 2, background: '#fff', paddingTop: 4 }}>
          <button onClick={onClose} aria-label="Fermer" style={{ position: 'absolute', left: 0, top: 0, width: 42, height: 42, border: 0, borderRadius: '50%', background: '#F2F2EF', fontSize: 28, cursor: 'pointer' }}>×</button>
          <div style={{ textAlign: 'center', padding: '5px 50px 16px' }}>
            <div style={{ fontSize: 20, fontWeight: 1000, letterSpacing: '-.03em' }}>DÉMO NOX</div>
            <div style={{ color: '#77776F', fontSize: 12, marginTop: 3 }}>{exercise?.name}</div>
          </div>
        </div>

        <div style={{ background: '#FAFAF8', border: '1px solid #E8E8E3', borderRadius: 24, padding: '16px 10px 12px', marginBottom: 18 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 42px 1fr', alignItems: 'center' }}>
            <DemoFigure phase={0} exercise={exercise} />
            <div style={{ color: ACCENT, fontSize: 36, fontWeight: 1000, textAlign: 'center' }}>→</div>
            <DemoFigure phase={phase === 0 ? 2 : phase} exercise={exercise} />
          </div>
          <div style={{ textAlign: 'center', fontSize: 10, color: '#777', fontWeight: 800 }}>Animation NOX · le mouvement tourne automatiquement</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 18 }}>
          {steps.map((step, i) => <button key={step.title} onClick={() => setPhase(i)} style={{ border: 0, background: 'transparent', cursor: 'pointer', padding: 0 }}>
            <div style={{ width: 44, height: 44, margin: '0 auto 7px', borderRadius: '50%', display: 'grid', placeItems: 'center', background: phase === i ? ACCENT : '#EFEFF1', fontSize: 18, fontWeight: 1000 }}>{i + 1}</div>
            <div style={{ fontSize: 10, lineHeight: 1.15, fontWeight: 900 }}>{step.title}</div>
          </button>)}
        </div>

        <div style={{ background: '#F3FFE0', borderRadius: 22, padding: '16px', marginBottom: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 1000, color: '#3E6300', marginBottom: 12 }}>💡 &nbsp; CONSEILS COACH</div>
          {steps.map((step, i) => <div key={i} style={{ display: 'grid', gridTemplateColumns: '28px 1fr', gap: 10, alignItems: 'start', marginTop: i ? 10 : 0 }}>
            <div style={{ width: 27, height: 27, borderRadius: '50%', background: ACCENT, display: 'grid', placeItems: 'center', fontWeight: 1000, fontSize: 11 }}>{i + 1}</div>
            <div style={{ fontSize: 11.5, color: '#333', lineHeight: 1.4, paddingTop: 4 }}>{step.cue}</div>
          </div>)}
        </div>

        <div style={{ fontSize: 11, fontWeight: 950, color: '#77776F', letterSpacing: '.06em', marginBottom: 9 }}>MUSCLES SOLLICITÉS</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 22 }}>{tags.map(tag => <span key={tag} style={{ padding: '9px 13px', borderRadius: 999, background: '#F1F1EE', fontSize: 11, fontWeight: 850 }}>{tag}</span>)}</div>
        <button onClick={onClose} style={{ width: '100%', border: 0, borderRadius: 18, background: ACCENT, padding: 18, color: '#111', fontSize: 16, fontWeight: 1000, cursor: 'pointer' }}>J’AI COMPRIS !</button>
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
