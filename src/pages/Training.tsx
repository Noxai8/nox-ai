import { calculateProgressiveOverload, detectStagnation } from '../lib/noxBrain';
import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getExerciseVisualPath, getExerciseVisualById, getExerciseMuscles } from '../lib/exerciseVisuals';
import TutorialTooltip from '../components/TutorialTooltip';
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
const ACCENT = '#C8FF00';
const BG = '#F7F8F4';
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

type ExerciseTrackingMode = 'timed' | 'bodyweight_reps' | 'weighted_reps';

const TIMED_EXERCISE_IDS = new Set([
  'plank', 'side_plank', 'wall_sit', 'hollow_hold',
]);

const BODYWEIGHT_EXERCISE_IDS = new Set([
  'bodyweight_squat', 'push_up', 'incline_push_up', 'decline_push_up',
  'diamond_push_up', 'bodyweight_lunge', 'reverse_lunge', 'walking_lunge',
  'step_up', 'glute_bridge', 'single_leg_glute_bridge', 'single_leg_calf_raise',
  'dead_bug', 'bird_dog', 'reverse_crunch', 'bicycle_crunch',
  'lying_leg_raise', 'v_up', 'bear_crawl',
]);

function getExerciseTrackingMode(exercise: any): ExerciseTrackingMode {
  const id = String(exercise?.exercise_id || '').trim().toLowerCase();
  const prescription = String(exercise?.reps || '').trim().toLowerCase();
  if (/\b\d+\s*(?:-|–|à)?\s*\d*\s*(?:sec|secs|seconde|secondes|min|mins|minute|minutes)\b/i.test(prescription)) return 'timed';
  if (TIMED_EXERCISE_IDS.has(id)) return 'timed';
  if (BODYWEIGHT_EXERCISE_IDS.has(id)) return 'bodyweight_reps';
  return 'weighted_reps';
}

function getTargetSeconds(value: unknown): number {
  const text = String(value || '').toLowerCase();
  const range = text.match(/(\d+)\s*(?:-|–|à)\s*(\d+)\s*(sec|secs|seconde|secondes|min|mins|minute|minutes)/);
  if (range) { const max = Number(range[2]); return range[3].startsWith('min') ? max * 60 : max; }
  const single = text.match(/(\d+)\s*(sec|secs|seconde|secondes|min|mins|minute|minutes)/);
  if (single) { const amount = Number(single[1]); return single[2].startsWith('min') ? amount * 60 : amount; }
  return 30;
}

type CooldownStretch = {
  id: string;
  name: string;
  duration: number;
  instruction: string;
  tip: string;
  image: string;
};

function buildCooldownStretches(exercises: any[]): CooldownStretch[] {
  const ids = new Set(
    exercises.map(ex => String(ex?.exercise_id || '').trim().toLowerCase()).filter(Boolean)
  );

  const library: Record<string, CooldownStretch> = {
    quad: { id: 'quad-stretch', name: 'Étirement quadriceps', duration: 30, instruction: 'Debout, ramène doucement le talon vers la fesse et garde les genoux proches.', tip: 'Garde le bassin droit et évite de cambrer le dos.', image: '/exercises/stretches/quad-stretch.webp' },
    hamstring: { id: 'hamstring-stretch', name: 'Étirement ischio-jambiers', duration: 30, instruction: 'Tends une jambe devant toi, garde le dos long puis incline doucement le buste vers l\'avant.', tip: 'Ne cherche pas à toucher le pied : privilégie une tension douce derrière la cuisse.', image: '/exercises/stretches/hamstring-stretch.webp' },
    glute: { id: 'glute-stretch', name: 'Étirement fessiers', duration: 30, instruction: 'Allongé sur le dos, pose une cheville sur le genou opposé puis rapproche doucement la jambe.', tip: 'Relâche les épaules et ne force jamais l\'amplitude.', image: '/exercises/stretches/glute-stretch.webp' },
    calf: { id: 'calf-stretch', name: 'Étirement mollets', duration: 30, instruction: 'Place les mains contre un support, recule une jambe et garde son talon au sol.', tip: 'Garde le pied arrière orienté vers l\'avant et la jambe tendue.', image: '/exercises/stretches/calf-stretch.webp' },
    hipFlexor: { id: 'hip-flexor-stretch', name: 'Fléchisseurs de hanche', duration: 30, instruction: 'En fente, pose un genou au sol puis avance doucement le bassin.', tip: 'Contracte légèrement le fessier de la jambe arrière pour mieux cibler la hanche.', image: '/exercises/stretches/hip-flexor-stretch.webp' },
    adductor: { id: 'adductor-stretch', name: 'Étirement adducteurs', duration: 30, instruction: 'Écarte les jambes puis fléchis doucement un côté en gardant l\'autre jambe allongée.', tip: 'Garde le dos long et contrôle l\'amplitude.', image: '/exercises/stretches/adductor-stretch.webp' },
    chest: { id: 'chest-stretch', name: 'Ouverture des pectoraux', duration: 30, instruction: 'Place ton avant-bras contre un support puis tourne doucement le buste dans la direction opposée.', tip: 'L\'étirement doit rester confortable, jamais douloureux.', image: '/exercises/stretches/chest-stretch.webp' },
    shoulder: { id: 'shoulder-stretch', name: 'Étirement épaules', duration: 30, instruction: 'Ramène un bras devant la poitrine et accompagne-le doucement avec l\'autre bras.', tip: 'Garde l\'épaule basse et évite de tourner le buste.', image: '/exercises/stretches/shoulder-stretch.webp' },
    triceps: { id: 'triceps-stretch', name: 'Étirement triceps', duration: 30, instruction: 'Passe une main derrière la tête puis accompagne doucement le coude avec l'autre main.', tip: 'Reste grand et évite de cambrer le bas du dos.', image: '/exercises/stretches/triceps-stretch.webp' },
    lat: { id: 'lat-stretch', name: 'Étirement dorsaux', duration: 30, instruction: 'Recule les hanches en gardant les bras loin devant toi et la poitrine dirigée vers le sol.', tip: 'Respire lentement et cherche de la longueur sur les côtés du dos.', image: '/exercises/stretches/lat-stretch.webp' },
    upperBack: { id: 'upper-back-stretch', name: 'Relâchement haut du dos', duration: 30, instruction: 'Arrondis doucement le haut du dos en tendant les bras devant toi.', tip: 'Éloigne les omoplates sans forcer sur la nuque.', image: '/exercises/stretches/upper-back-stretch.webp' },
    core: { id: 'core-release', name: 'Relâchement abdominal', duration: 30, instruction: 'Allonge-toi sur le ventre puis redresse doucement le buste en gardant le bassin relâché.', tip: 'Monte seulement jusqu\'à sentir un étirement léger.', image: '/exercises/stretches/core-release.webp' },
  };

  const selected: CooldownStretch[] = [];
  const add = (key: keyof typeof library) => {
    const stretch = library[key];
    if (stretch && !selected.some(item => item.id === stretch.id)) selected.push(stretch);
  };
  const has = (...exerciseIds: string[]) => exerciseIds.some(id => ids.has(id));

  if (has('bodyweight_squat', 'wall_sit', 'step_up')) { add('quad'); add('hamstring'); add('hipFlexor'); }
  if (has('bodyweight_lunge', 'reverse_lunge', 'walking_lunge')) { add('quad'); add('glute'); add('hipFlexor'); add('adductor'); }
  if (has('glute_bridge', 'single_leg_glute_bridge')) { add('glute'); add('hamstring'); add('hipFlexor'); }
  if (has('single_leg_calf_raise')) add('calf');
  if (has('push_up', 'incline_push_up', 'decline_push_up', 'diamond_push_up')) { add('chest'); add('shoulder'); add('triceps'); }
  if (has('plank', 'side_plank', 'dead_bug', 'bird_dog', 'hollow_hold', 'reverse_crunch', 'bicycle_crunch', 'lying_leg_raise', 'v_up')) { add('core'); add('lat'); add('upperBack'); }

  return selected.slice(0, 5);
}

function estimateWorkoutCalories({
  weightKg,
  durationMinutes,
  completedSetCount,
}: {
  weightKg: number;
  durationMinutes: number;
  completedSetCount: number;
}): number | null {
  if (
    !Number.isFinite(weightKg) || weightKg <= 0 ||
    !Number.isFinite(durationMinutes) || durationMinutes <= 0 ||
    completedSetCount <= 0
  ) { return null; }
  const MET = 4.5;
  return Math.max(1, Math.round((MET * 3.5 * weightKg / 200) * durationMinutes));
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
const [notesOpen, setNotesOpen] = useState(false);
const [exerciseNote, setExerciseNote] = useState('');
const [noteSaving, setNoteSaving] = useState(false);
const [noteSaved, setNoteSaved] = useState(false);
const [warmupSets, setWarmupSets] = useState<Record<number, boolean>>({});
const [showSubstitute, setShowSubstitute] = useState(false);
const [comebackMode, setComebackMode] = useState(false);
const [isOffline, setIsOffline] = useState(!navigator.onLine);
const [pendingSync, setPendingSync] = useState(0);
const [overloadSuggestion, setOverloadSuggestion] = useState<any>(null);
const [stagnation, setStagnation] = useState<any>(null);
const [trainingError, setTrainingError] = useState('');
const [done, setDone] = useState(false);
const [sessionFeedback, setSessionFeedback] = useState<'hard' | 'good' | 'easy' | null>(null);
const [feedbackSaving, setFeedbackSaving] = useState(false);
const [feedbackError, setFeedbackError] = useState('');
const [workoutId, setWorkoutId] = useState<string | null>(null);
const [loading, setLoading] = useState(true);
const [savingSet, setSavingSet] = useState(false);
const [showDemo, setShowDemo] = useState(false);
const [showSkipExercise, setShowSkipExercise] = useState(false);
const [finalDuration, setFinalDuration] = useState(0);
const [estimatedCalories, setEstimatedCalories] = useState<number | null>(null);
const [showFinishConfetti, setShowFinishConfetti] = useState(false);
const [guideTab, setGuideTab] = useState<'steps' | 'tips' | 'mistakes'>('steps');
const [exerciseDifficultyFeedback, setExerciseDifficultyFeedback] = useState('');
const [showExerciseFeedback, setShowExerciseFeedback] = useState(false);
const [startTime] = useState(Date.now());
const timerRef = useRef<any>(null);
const finishingRef = useRef(false);
const [exerciseTimer, setExerciseTimer] = useState(0);
const [exerciseTimerRunning, setExerciseTimerRunning] = useState(false);
const [countdown, setCountdown] = useState<number | null>(null);
const exerciseTimerRef = useRef<any>(null);
const cooldownTimerRef = useRef<any>(null);
const [showCooldown, setShowCooldown] = useState(false);
const [cooldownIdx, setCooldownIdx] = useState(0);
const [cooldownTime, setCooldownTime] = useState(30);
const [cooldownRunning, setCooldownRunning] = useState(false);
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

// Charger automatiquement la note de l'exercice courant
useEffect(() => {
  const loadExerciseNote = async () => {
    if (!user || !workoutId || !exercises[currentIdx]?.name) {
      setExerciseNote('');
      return;
    }
    try {
      const { data, error } = await supabase
        .from('workouts')
        .select('notes')
        .eq('id', workoutId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      const key = exerciseNoteKey(exercises[currentIdx].name);
      const savedNote = data?.notes?.[key];
      setExerciseNote(typeof savedNote === 'string' ? savedNote : '');
      setNoteSaved(false);
      setNotesOpen(false);
    } catch (err) {
      console.error('Training loadExerciseNote:', err);
      setExerciseNote('');
    }
  };
  loadExerciseNote();
}, [workoutId, currentIdx, user?.id]);

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
useEffect(() => {
  clearInterval(exerciseTimerRef.current);
  setExerciseTimerRunning(false);
  setCountdown(null);
  const currentExercise = exercises[currentIdx];
  const mode = getExerciseTrackingMode(currentExercise);
  const seconds = getTargetSeconds(currentExercise?.reps);
  if (mode === 'timed') { setExerciseTimer(seconds); }
  else { setExerciseTimer(0); }
  return () => clearInterval(exerciseTimerRef.current);
}, [currentIdx, currentSet, exercises]);

useEffect(() => { setGuideTab('steps'); }, [currentIdx]);
useEffect(() => { setExerciseDifficultyFeedback(''); }, [currentIdx]);

const toggleExerciseTimer = () => {
  const currentExercise = exercises[currentIdx];
  const seconds = getTargetSeconds(currentExercise?.reps);

  if (exerciseTimerRunning || countdown !== null) {
    clearInterval(exerciseTimerRef.current);
    setExerciseTimerRunning(false);
    setCountdown(null);
    return;
  }
  if (exerciseTimer <= 0) { setExerciseTimer(seconds); }

  // Countdown 3-2-1 avant de lancer
  setCountdown(3);
  let count = 3;
  exerciseTimerRef.current = setInterval(() => {
    count -= 1;
    if (count > 0) {
      setCountdown(count);
    } else {
      clearInterval(exerciseTimerRef.current);
      setCountdown(null);
      setExerciseTimerRunning(true);
      exerciseTimerRef.current = setInterval(() => {
        setExerciseTimer(previous => {
          if (previous <= 1) {
            clearInterval(exerciseTimerRef.current);
            setExerciseTimerRunning(false);
            return 0;
          }
          return previous - 1;
        });
      }, 1000);
    }
  }, 1000);
};

const skipCurrentExercise = () => {
  clearInterval(exerciseTimerRef.current);
  clearInterval(timerRef.current);
  setExerciseTimerRunning(false);
  setCountdown(null);
  setResting(false);
  setRestTime(0);
  setWeight('');
  setReps('');
  setCurrentSet(1);
  setShowSkipExercise(false);
  setTrainingError('');
  if (currentIdx >= exercises.length - 1) return;
  setCurrentIdx(i => i + 1);
};

const getPerformedExercises = () => {
  const performedNames = new Set(
    completedSets.map(row => String(row?.exercise_name || '').trim()).filter(Boolean)
  );
  return exercises.filter(ex => performedNames.has(String(ex?.name || '').trim()));
};

const confirmExerciseFeedback = async () => {
  setShowExerciseFeedback(false);
  const ex = exercises[currentIdx];
  const restSecs = parseRestSeconds(ex?.rest);
  setCurrentSet(1);

  if (currentIdx >= exercises.length - 1) {
    const stretches = buildCooldownStretches(getPerformedExercises());
    if (stretches.length > 0) {
      setCooldownIdx(0);
      setCooldownTime(stretches[0].duration);
      setCooldownRunning(false);
      setShowCooldown(true);
    } else {
      await finishWorkout();
    }
  } else {
    setCurrentIdx(i => i + 1);
    startRest(restSecs);
  }
};

const cooldownStretches = buildCooldownStretches(getPerformedExercises());
const currentStretch = cooldownStretches[cooldownIdx];

const startCooldownTimer = () => {
  if (!currentStretch || cooldownRunning) return;
  clearInterval(cooldownTimerRef.current);
  if (cooldownTime <= 0) { setCooldownTime(currentStretch.duration); }
  setCooldownRunning(true);
  cooldownTimerRef.current = setInterval(() => {
    setCooldownTime(previous => {
      if (previous <= 1) { clearInterval(cooldownTimerRef.current); setCooldownRunning(false); return 0; }
      return previous - 1;
    });
  }, 1000);
};

const nextCooldownStretch = async () => {
  clearInterval(cooldownTimerRef.current);
  setCooldownRunning(false);
  if (cooldownIdx >= cooldownStretches.length - 1) { setShowCooldown(false); await finishWorkout(); return; }
  const nextIndex = cooldownIdx + 1;
  setCooldownIdx(nextIndex);
  setCooldownTime(cooldownStretches[nextIndex].duration);
};

const skipCooldown = async () => {
  clearInterval(cooldownTimerRef.current);
  setCooldownRunning(false);
  setShowCooldown(false);
  await finishWorkout();
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

const mode = getExerciseTrackingMode(ex);
const parsedWeight = mode === 'weighted_reps' ? Number(String(weight).replace(',', '.')) : 0;
const parsedReps = mode === 'timed' ? targetSeconds : Number(reps);

if (mode === 'weighted_reps' && (!Number.isFinite(parsedWeight) || parsedWeight < 0)) {
  setTrainingError('Entre une charge valide.');
  return;
}
if (mode !== 'timed' && (!Number.isInteger(parsedReps) || parsedReps <= 0 || parsedReps > 200)) {
  setTrainingError('Entre un nombre de répétitions valide.');
  return;
}
if (mode === 'timed' && exerciseTimer > 0) {
  setTrainingError('Termine le minuteur avant de valider la série.');
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
  // Sécurité anti-doublon : une même série ne doit jamais être créée deux fois.
  const { data: existingSet, error: existingSetError } = await supabase
    .from('workout_sets')
    .select('exercise_name, set_number, weight, reps, created_at')
    .eq('user_id', user.id)
    .eq('workout_id', workoutId)
    .eq('exercise_name', ex.name)
    .eq('set_number', currentSet)
    .maybeSingle();

  if (existingSetError) {
    throw new Error(`Impossible de vérifier la série : ${existingSetError.message}`);
  }

  if (existingSet) {
    setCompletedSets(prev => {
      const alreadyLoaded = prev.some(
        row => row.exercise_name === ex.name && Number(row.set_number) === Number(currentSet)
      );
      return alreadyLoaded ? prev : [...prev, existingSet];
    });

    const totalSets = parseInt(ex.sets) || 3;
    const restSecs = parseRestSeconds(ex.rest);
    setWeight('');
    setReps('');
    setTrainingError('');

    if (currentSet >= totalSets) {
      setShowExerciseFeedback(true);
    } else {
      setCurrentSet(s => s + 1);
      startRest(restSecs);
    }
    return;
  }

  // La série n'existe pas : insertion normale.
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
    // Afficher le feedback de difficulté avant de continuer
    setShowExerciseFeedback(true);
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
    .select('xp, starting_weight_kg')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) throw profileError;

  const calories = estimateWorkoutCalories({
    weightKg: Number(profile?.starting_weight_kg),
    durationMinutes: duration,
    completedSetCount: completedSets.length,
  });
  setFinalDuration(duration);
  setEstimatedCalories(calories);

  const { error: rewardError } = await supabase
    .from('profiles')
    .update({
      streak_days: streak,
      xp: Number(profile?.xp || 0) + 50,
    })
    .eq('id', user.id);

  if (rewardError) throw rewardError;

  setShowFinishConfetti(true);
  window.setTimeout(() => { setShowFinishConfetti(false); }, 3500);
  setDone(true);
} catch (err: any) {
  console.error('Training finishWorkout:', err);
  setTrainingError(err?.message || 'Impossible de terminer la séance.');
} finally {
  finishingRef.current = false;
}

};
const saveSessionFeedback = async (feedback: 'hard' | 'good' | 'easy') => {
  if (!user || !workoutId || feedbackSaving) return;
  setFeedbackSaving(true);
  setFeedbackError('');
  try {
    const { data, error } = await supabase
      .from('workouts')
      .update({ session_feedback: feedback })
      .eq('id', workoutId)
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .select('id, session_feedback')
      .maybeSingle();
    if (error) throw error;
    if (!data?.id) throw new Error("Le ressenti n'a pas pu être associé à cette séance.");
    setSessionFeedback(feedback);
  } catch (err: any) {
    console.error('Training saveSessionFeedback:', err);
    setFeedbackError(err?.message || "Impossible d'enregistrer ton ressenti.");
  } finally {
    setFeedbackSaving(false);
  }
};

const exerciseNoteKey = (name: string) =>
  name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const saveExerciseNote = async () => {
  const currentExerciseName = exercises[currentIdx]?.name;
  if (!user || !workoutId || !currentExerciseName) return;
  setNoteSaving(true);
  setNoteSaved(false);
  try {
    const key = exerciseNoteKey(currentExerciseName);
    const { data: workout, error: readError } = await supabase
      .from('workouts')
      .select('notes')
      .eq('id', workoutId)
      .eq('user_id', user.id)
      .single();
    if (readError) throw readError;
    const notes = { ...(workout?.notes || {}), [key]: exerciseNote.trim() };
    const { error } = await supabase
      .from('workouts')
      .update({ notes })
      .eq('id', workoutId)
      .eq('user_id', user.id);
    if (error) throw error;
    setNoteSaved(true);
  } catch (err) {
    console.error('Training saveExerciseNote:', err);
    setTrainingError("Impossible d'enregistrer la note.");
  } finally {
    setNoteSaving(false);
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
<div style={{ minHeight: '100vh', background: '#F7F8F4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
<NoxBrand />
<div style={{ width: 38, height: 38, border: '3px solid #ECECE7', borderTop: '3px solid ' + ACCENT, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
<div style={{ color: '#77776F', fontSize: 12, fontWeight: 700 }}>Chargement de la séance...</div>
<style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
</div>
);
if (!exercises.length) return (
<div style={{ minHeight: '100vh', background: '#F7F8F4', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center' }}>
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
if (showCooldown && currentStretch) {
  return (
    <div style={{ minHeight: '100vh', background: '#080808', color: '#FFFFFF', display: 'flex', justifyContent: 'center' }}>
      <main style={{ width: '100%', maxWidth: 560, minHeight: '100vh', padding: '34px 20px 28px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}><NoxBrand compact dark /></div>

        <div style={{ marginTop: 42 }}>
          <div style={{ color: ACCENT, fontSize: 10, fontWeight: 1000, letterSpacing: '.12em' }}>RETOUR AU CALME</div>
          <h1 style={{ margin: '8px 0 8px', fontSize: 38, lineHeight: 0.95, fontWeight: 1000, letterSpacing: '-.05em' }}>ÉTIREMENTS.</h1>
          <div style={{ color: '#929292', fontSize: 13, lineHeight: 1.5 }}>Quelques minutes pour relâcher les zones que tu viens de travailler.</div>
        </div>

        <div style={{ height: 4, background: '#242424', borderRadius: 999, overflow: 'hidden', margin: '24px 0 28px' }}>
          <div style={{ width: `${((cooldownIdx + 1) / cooldownStretches.length) * 100}%`, height: '100%', background: ACCENT, borderRadius: 999, transition: 'width .3s ease' }} />
        </div>

        <section style={{ background: '#111111', border: '1px solid #242424', borderRadius: 28, padding: 22 }}>
          <div style={{ color: '#777', fontSize: 10, fontWeight: 900, letterSpacing: '.1em' }}>ÉTIREMENT {cooldownIdx + 1}/{cooldownStretches.length}</div>
          <div style={{ fontSize: 27, fontWeight: 1000, marginTop: 8, letterSpacing: '-.035em' }}>{currentStretch.name}</div>
          <div style={{ marginTop: 18, height: 250, borderRadius: 20, overflow: 'hidden', background: '#080808', border: '1px solid #242424', display: 'grid', placeItems: 'center' }}>
            <img src={currentStretch.image} alt={currentStretch.name}
              style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center', display: 'block' }} />
          </div>

          <div style={{ marginTop: 16, color: '#B5B5B5', fontSize: 13, lineHeight: 1.55 }}>{currentStretch.instruction}</div>
          <div style={{ marginTop: 18, padding: '14px 16px', background: '#181818', borderRadius: 16 }}>
            <div style={{ color: ACCENT, fontSize: 9, fontWeight: 1000, letterSpacing: '.08em' }}>TIP NOX</div>
            <div style={{ color: '#B5B5B5', fontSize: 12, marginTop: 5, lineHeight: 1.45 }}>{currentStretch.tip}</div>
          </div>
        </section>

        <div style={{ textAlign: 'center', marginTop: 30 }}>
          <div style={{ fontSize: 72, lineHeight: 1, fontWeight: 1000, letterSpacing: '-.06em', color: cooldownTime === 0 ? ACCENT : '#FFFFFF' }}>
            0:{String(cooldownTime).padStart(2, '0')}
          </div>
          <div style={{ color: '#777', fontSize: 10, fontWeight: 900, marginTop: 8, letterSpacing: '.08em' }}>RESPIRATION LENTE</div>
        </div>

        <div style={{ marginTop: 'auto', paddingTop: 30 }}>
          {cooldownTime > 0 ? (
            <button type="button" onClick={startCooldownTimer} disabled={cooldownRunning}
              style={{ width: '100%', padding: 18, border: 0, borderRadius: 18, background: cooldownRunning ? '#202020' : ACCENT, color: cooldownRunning ? '#777' : '#080808', fontSize: 14, fontWeight: 1000, cursor: cooldownRunning ? 'default' : 'pointer' }}>
              {cooldownRunning ? 'ÉTIREMENT EN COURS...' : 'DÉMARRER 30 SEC'}
            </button>
          ) : (
            <button type="button" onClick={() => void nextCooldownStretch()}
              style={{ width: '100%', padding: 18, border: 0, borderRadius: 18, background: ACCENT, color: '#080808', fontSize: 14, fontWeight: 1000, cursor: 'pointer' }}>
              {cooldownIdx >= cooldownStretches.length - 1 ? 'TERMINER LA SÉANCE ✓' : 'ÉTIREMENT SUIVANT →'}
            </button>
          )}
          <button type="button" onClick={() => void skipCooldown()}
            style={{ width: '100%', padding: 15, border: 0, background: 'transparent', color: '#777', fontSize: 10, fontWeight: 900, cursor: 'pointer', marginTop: 6 }}>
            PASSER LES ÉTIREMENTS
          </button>
        </div>
      </main>
    </div>
  );
}

if (done) {
  const duration = finalDuration || Math.max(1, Math.round((Date.now() - startTime) / 60000));

  const completedExerciseNames = new Set(
    completedSets
      .map(set => String(set?.exercise_name || '').trim())
      .filter(Boolean)
  );
  const completedExerciseCount = completedExerciseNames.size;

  return (
    <div style={{ minHeight: '100vh', background: '#F7F8F4', color: '#0B0B0B', display: 'flex', justifyContent: 'center' }}>
      <main style={{ width: '100%', maxWidth: 560, minHeight: '100vh', padding: '54px 20px 28px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>

        {showFinishConfetti && (
          <div aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: 9999, pointerEvents: 'none', overflow: 'hidden' }}>
            {Array.from({ length: 28 }).map((_, index) => (
              <span key={index} style={{
                position: 'absolute',
                left: `${(index * 37) % 100}%`,
                top: '-20px',
                width: index % 3 === 0 ? 8 : 6,
                height: index % 2 === 0 ? 14 : 9,
                borderRadius: 2,
                background: index % 3 === 0 ? ACCENT : index % 3 === 1 ? '#111111' : '#A8A8A0',
                transform: `rotate(${index * 29}deg)`,
                animation: `noxConfetti ${1.8 + (index % 5) * 0.18}s ease-out ${(index % 7) * 0.06}s forwards`,
              }} />
            ))}
            <style>{`@keyframes noxConfetti { 0% { transform: translateY(-20px) rotate(0deg); opacity: 1; } 100% { transform: translateY(105vh) rotate(620deg); opacity: 0; } }`}</style>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 38 }}>
          <NoxBrand />
        </div>

        <div style={{ width: 70, height: 70, borderRadius: '50%', background: ACCENT, display: 'grid', placeItems: 'center', margin: '0 auto 22px', boxShadow: '0 12px 32px rgba(200,255,0,.28)' }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 12.5l4.2 4.2L19 7" stroke="#0B0B0B" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 10, fontWeight: 950, color: '#7A7F76', letterSpacing: '.14em', marginBottom: 9 }}>SÉANCE TERMINÉE</div>
          <h1 style={{ margin: 0, fontSize: 42, lineHeight: .92, fontWeight: 1000, letterSpacing: '-.055em' }}>
            BIEN JOUÉ.
          </h1>
          <div style={{ fontSize: 13, color: '#7A7F76', marginTop: 11, lineHeight: 1.45 }}>Ta séance est enregistrée. NOX garde ces données pour suivre ta progression.</div>
        </div>

        <section style={{ background: '#0B0B0B', borderRadius: 26, padding: '22px 18px 18px', marginBottom: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
            {[
              [String(duration), 'MIN'],
              [String(completedExerciseCount), 'EXOS'],
              [String(completedSets.length), 'SÉRIES'],
              [estimatedCalories !== null ? String(estimatedCalories) : '---', 'KCAL EST.'],
            ].map(([value, label], index) => (
              <div key={label} style={{ textAlign: 'center', borderLeft: index ? '1px solid #242424' : 'none' }}>
                <div style={{ fontSize: 30, fontWeight: 1000, color: index === 2 ? ACCENT : '#FFFFFF', letterSpacing: '-.04em' }}>{value}</div>
                <div style={{ fontSize: 8.5, color: '#77776F', fontWeight: 900, marginTop: 5, letterSpacing: '.06em' }}>{label}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 19, paddingTop: 15, borderTop: '1px solid #242424', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div style={{ color: '#FFFFFF', fontSize: 12, fontWeight: 900 }}>Progression enregistrée</div>
              <div style={{ color: '#77776F', fontSize: 10.5, marginTop: 3 }}>Streak et historique mis à jour</div>
            </div>
            <div style={{ color: ACCENT, fontSize: 12, fontWeight: 1000 }}>+50 XP</div>
          </div>
        </section>

        {estimatedCalories !== null && (
          <div style={{ marginTop: -8, marginBottom: 10, color: '#77776F', fontSize: 9.5, lineHeight: 1.4, textAlign: 'center' }}>
            Calories estimées selon ton poids et la durée de la séance.
          </div>
        )}

        <section style={{ background: '#FFFFFF', border: '1px solid #E6E8E0', borderRadius: 22, padding: 18, marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 1000, color: '#111', letterSpacing: '.08em', marginBottom: 6 }}>COMMENT TU TE SENS ?</div>
          <div style={{ fontSize: 12.5, color: '#77776F', lineHeight: 1.45 }}>Ton ressenti aidera NOX à adapter la récupération et tes prochaines séances.</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 15 }}>
            {([
              { label: 'DIFFICILE', value: 'hard' },
              { label: 'BIEN', value: 'good' },
              { label: 'FACILE', value: 'easy' },
            ] as { label: string; value: 'hard' | 'good' | 'easy' }[]).map(option => {
              const selected = sessionFeedback === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  disabled={feedbackSaving}
                  onClick={() => void saveSessionFeedback(option.value)}
                  style={{
                    height: 44, borderRadius: 13,
                    border: selected ? `2px solid ${ACCENT}` : '1px solid #E6E8E0',
                    background: selected ? '#F2FFD0' : '#F7F8F4',
                    color: '#111', fontSize: 10, fontWeight: 950,
                    cursor: feedbackSaving ? 'wait' : 'pointer',
                    opacity: feedbackSaving && !selected ? 0.55 : 1,
                    transition: 'background .15s ease, border .15s ease, opacity .15s ease',
                  }}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          {feedbackSaving && (
            <div style={{ marginTop: 10, fontSize: 10.5, color: '#929292', fontWeight: 750 }}>Enregistrement…</div>
          )}
          {!feedbackSaving && sessionFeedback && (
            <div style={{ marginTop: 10, fontSize: 10.5, color: '#59604F', fontWeight: 850 }}>Ressenti enregistré ✓</div>
          )}
          {feedbackError && (
            <div style={{ marginTop: 10, padding: '9px 11px', borderRadius: 11, background: '#FFF2F2', border: '1px solid #FFB8B8', color: '#9B1C1C', fontSize: 10.5, lineHeight: 1.4, fontWeight: 750 }}>
              {feedbackError}
            </div>
          )}
        </section>

        <button onClick={() => navigate('/training-calendar')}
          style={{ width: '100%', padding: 18, background: ACCENT, border: 'none', borderRadius: 18, color: '#0B0B0B', fontWeight: 1000, fontSize: 13, cursor: 'pointer', marginTop: 'auto' }}>
          VOIR MON CALENDRIER →
        </button>
        <button onClick={() => navigate('/home')}
          style={{ width: '100%', padding: '14px 18px', background: 'transparent', border: 'none', color: '#77776F', fontWeight: 850, fontSize: 11, cursor: 'pointer', marginTop: 4 }}>
          RETOUR À L'ACCUEIL
        </button>
      </main>
    </div>
  );
}

const ex = exercises[currentIdx];
const noxExercise = resolvedNoxExercise(ex);
const tags = muscleTags(ex);

const exerciseSteps = noxExercise ? getNoxExerciseSteps(noxExercise.id) : demoSteps(ex);
const exerciseTips = noxExercise ? getNoxExerciseCoachTips(noxExercise.id) : exerciseSteps.map(step => step.cue);
const exerciseMistakes = noxExercise ? getNoxExerciseMistakes(noxExercise.id) : [];
const exerciseMuscles = noxExercise ? getNoxExerciseMuscles(noxExercise.id) : { primary: tags, secondary: [], stabilizers: [] };
const exerciseDifficulty = noxExercise?.difficulty || ex?.difficulty || 'Standard';
const totalSets = parseInt(ex?.sets) || 3;

const trackingMode = getExerciseTrackingMode(ex);
const targetSeconds = getTargetSeconds(ex?.reps);
const exerciseProgress = ((currentIdx + (currentSet - 1) / totalSets) / exercises.length) * 100;
return (
<div style={{
minHeight: '100vh',
background: '#080808',
color: '#FFFFFF',
display: 'flex',
flexDirection: 'column',
transition: 'background .25s ease, color .25s ease',
}}>
<main style={{
width: '100%',
maxWidth: 560,
minHeight: '100vh',
margin: '0 auto',
background: '#080808',
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
color: '#FFFFFF', cursor: 'pointer',
fontSize: 27, lineHeight: 1, display: 'grid', placeItems: 'center', padding: 0,
}}
>
×
</button>

        <div style={{ textAlign: 'center', minWidth: 0 }}>
          {!resting && <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}><NoxBrand compact dark /></div>}
          <div style={{
            fontSize: resting ? 13 : 11,
            fontWeight: 950,
            color: '#929292',
            textTransform: 'uppercase',
            letterSpacing: '.08em',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {sessionName}
          </div>
        </div>

        <div style={{ textAlign: 'right', fontSize: 12, fontWeight: 800, color: '#929292' }}>
          {currentIdx + 1}/{exercises.length}
        </div>
      </div>

      <div style={{ height: 4, background: '#242424', borderRadius: 999, overflow: 'hidden', marginBottom: resting ? 12 : 20 }}>
        <div style={{ height: '100%', width: `${Math.max(3, exerciseProgress)}%`, background: ACCENT, borderRadius: 999, transition: 'width .4s' }} />
      </div>
    </div>

    {trainingError && (
      <div style={{ margin: '0 20px 12px', background: '#FFF2F2', border: '1px solid #FFB8B8', borderRadius: 13, padding: '11px 13px', color: '#9B1C1C', fontSize: 11.5, lineHeight: 1.45, fontWeight: 750 }}>
        {trainingError}
      </div>
    )}

    {stagnation?.stagnating && !resting && (
      <div style={{ margin: '0 20px 12px', background: '#111111', border: '1px solid #242424', borderRadius: 13, padding: '11px 13px' }}>
        <div style={{ fontSize: 9.5, color: '#FFFFFF', fontWeight: 1000, textTransform: 'uppercase', letterSpacing: '.07em' }}>ANALYSE NOX</div>
        <div style={{ fontSize: 11, color: '#929292', marginTop: 4, lineHeight: 1.45 }}>{stagnation.suggestion}</div>
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
      <div style={{ margin: '0 20px 12px', background: ACCENT, borderRadius: 18, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 900, color: '#0B0B0B', letterSpacing: '.1em', marginBottom: 2 }}>NOUVEAU RECORD</div>
          <div style={{ fontSize: 15, fontWeight: 950, color: '#0B0B0B' }}>{newPR.name} — {newPR.weight}kg × {newPR.reps}</div>
        </div>
        <div style={{ fontSize: 28 }}>⚡</div>
      </div>
    )}

    {/* Progressive Overload suggestion */}
    {overloadSuggestion && !resting && (
      <div style={{ margin: '0 20px 12px', background: '#111111', border: `1px solid ${ACCENT}`, borderRadius: 13, padding: '11px 13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 9.5, color: '#FFFFFF', fontWeight: 1000, textTransform: 'uppercase', letterSpacing: '.07em' }}>PROGRESSION NOX</div>
          <div style={{ fontSize: 11, color: '#929292', marginTop: 4 }}>{overloadSuggestion.reason}</div>
        </div>
        <div style={{ fontSize: 18, fontWeight: 1000, color: ACCENT, flexShrink: 0, marginLeft: 12 }}>{overloadSuggestion.suggestedWeight} kg</div>
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
        {/* Fiche exercice NOX — Training Mode sombre. */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, color: '#929292', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 7, fontWeight: 900 }}>EXERCICE {currentIdx + 1}</div>
          <div style={{ fontSize: 31, fontWeight: 1000, color: '#FFFFFF', letterSpacing: '-.05em', lineHeight: .98 }}>{ex?.name}</div>
          <div style={{ fontSize: 13, color: '#929292', lineHeight: 1.4, marginTop: 10, fontWeight: 650 }}>{exerciseCoachCopy(ex)}</div>
        </div>

        {/* Carte MOUVEMENT — sans bouton démo */}
        <div style={{ width: '100%', border: '1px solid #242424', borderRadius: 28, overflow: 'hidden', background: '#111111', marginBottom: 12 }}>
          <NoxExerciseCover exercise={ex} tags={tags} />
        </div>

        {/* Guide COMMENT FAIRE */}
        <section style={{ marginTop: 12, marginBottom: 14, padding: 16, borderRadius: 22, border: '1px solid #242424', background: '#111111' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div>
              <div style={{ color: ACCENT, fontSize: 10, fontWeight: 1000, letterSpacing: '.1em' }}>⚡ COMMENT FAIRE ?</div>
              <div style={{ color: '#777', fontSize: 10, fontWeight: 800, marginTop: 4 }}>Niveau : {exerciseDifficulty}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 14 }}>
            {(['steps', 'tips', 'mistakes'] as const).map((id, i) => {
              const label = ['Étapes', 'Conseils', 'Erreurs'][i];
              const active = guideTab === id;
              return (
                <button key={id} type="button" onClick={() => setGuideTab(id)}
                  style={{ padding: '10px 6px', borderRadius: 999, border: active ? `1px solid ${ACCENT}` : '1px solid #292929', background: active ? '#181818' : '#151515', color: active ? '#FFFFFF' : '#929292', fontSize: 10, fontWeight: 900, cursor: 'pointer' }}>
                  {label}
                </button>
              );
            })}
          </div>

          {guideTab === 'steps' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {exerciseSteps.slice(0, 4).map((step, index) => (
                <div key={`${step.title}-${index}`} style={{ display: 'grid', gridTemplateColumns: '34px 1fr', gap: 10, padding: 12, borderRadius: 16, background: '#181818' }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid #555', display: 'grid', placeItems: 'center', color: '#FFFFFF', fontSize: 11, fontWeight: 1000 }}>{index + 1}</div>
                  <div>
                    <div style={{ color: '#FFFFFF', fontSize: 12, fontWeight: 1000 }}>{step.title}</div>
                    <div style={{ color: '#A0A0A0', fontSize: 11, lineHeight: 1.45, marginTop: 4 }}>{step.cue}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {guideTab === 'tips' && (
            <div style={{ padding: 14, borderRadius: 18, background: 'rgba(200,255,0,.06)', border: '1px solid rgba(200,255,0,.30)' }}>
              <div style={{ color: ACCENT, fontSize: 10, fontWeight: 1000, marginBottom: 12 }}>💡 TIPS NOX</div>
              {exerciseTips.slice(0, 4).map((tip, index) => (
                <div key={index} style={{ display: 'flex', gap: 9, marginTop: index ? 10 : 0, color: '#D0D0D0', fontSize: 11, lineHeight: 1.45 }}>
                  <span style={{ color: ACCENT, fontWeight: 1000 }}>✓</span><span>{tip}</span>
                </div>
              ))}
            </div>
          )}

          {guideTab === 'mistakes' && (
            <div style={{ padding: 14, borderRadius: 18, background: 'rgba(255,75,75,.06)', border: '1px solid rgba(255,75,75,.30)' }}>
              <div style={{ color: '#FF6262', fontSize: 10, fontWeight: 1000, marginBottom: 12 }}>⚠ ERREURS FRÉQUENTES</div>
              {exerciseMistakes.length > 0 ? exerciseMistakes.slice(0, 4).map((mistake, index) => (
                <div key={index} style={{ marginTop: index ? 11 : 0 }}>
                  <div style={{ display: 'flex', gap: 8, color: '#FFFFFF', fontSize: 11, fontWeight: 900 }}>
                    <span style={{ color: '#FF6262' }}>✕</span><span>{mistake.title}</span>
                  </div>
                  {mistake.correction && <div style={{ paddingLeft: 20, marginTop: 3, color: '#888', fontSize: 10, lineHeight: 1.4 }}>{mistake.correction}</div>}
                </div>
              )) : <div style={{ color: '#888', fontSize: 11 }}>Aucune erreur spécifique renseignée pour cet exercice.</div>}
            </div>
          )}
        </section>

        <div style={{ marginTop: 14 }}>
          <button
            type="button"
            onClick={() => { setNotesOpen(v => !v); setNoteSaved(false); }}
            style={{ width: '100%', padding: '14px 16px', borderRadius: 14, border: '1px solid #242424', background: '#161616', color: '#929292', fontWeight: 800, cursor: 'pointer' }}
          >
            📝 {exerciseNote.trim() ? 'Modifier ma note' : 'Notes'}
          </button>

          {notesOpen && (
            <div style={{ marginTop: 10 }}>
              <textarea
                value={exerciseNote}
                onChange={(e) => { setExerciseNote(e.target.value); setNoteSaved(false); }}
                placeholder="Ex : gêne épaule droite, augmenter la charge..."
                maxLength={500}
                rows={3}
                style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', padding: 14, borderRadius: 14, border: '1px solid #242424', background: '#111111', color: '#FFFFFF', outline: 'none', font: 'inherit' }}
              />
              <button
                type="button"
                onClick={saveExerciseNote}
                disabled={noteSaving}
                style={{ width: '100%', marginTop: 8, padding: 13, border: 0, borderRadius: 12, background: '#C8FF00', color: '#080808', fontWeight: 1000, cursor: noteSaving ? 'default' : 'pointer', opacity: noteSaving ? 0.6 : 1 }}
              >
                {noteSaving ? 'ENREGISTREMENT...' : noteSaved ? '✓ NOTE ENREGISTRÉE' : 'ENREGISTRER LA NOTE'}
              </button>
            </div>
          )}
        </div>

        {false && tags.length > 0 && <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 15 }}>
          {tags.map((tag, i) => <span key={tag} style={{ padding: '7px 11px', background: i === 0 ? '#F3FFE1' : '#F1F1EE', border: i === 0 ? `1px solid ${ACCENT}` : '1px solid transparent', borderRadius: 999, color: '#55554F', fontSize: 10.5, fontWeight: 800 }}>{tag}</span>)}
        </div>}

        <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '14px 16px', borderRadius: 20, background: '#111111', border: '1px solid #242424', marginBottom: 17 }}>
          <div style={{ width: 42, height: 42, borderRadius: 14, background: ACCENT, display: 'grid', placeItems: 'center', fontSize: 20 }}>🎯</div>
          <div><div style={{ fontSize: 9.5, color: '#929292', fontWeight: 950, letterSpacing: '.07em' }}>OBJECTIF DU JOUR</div>
          <div style={{ fontSize: 19, color: '#FFFFFF', fontWeight: 1000, marginTop: 2 }}>
  {trackingMode === 'timed' ? (ex?.reps || `${targetSeconds} sec`) : `${ex?.reps || '8–12'} répétitions`}
</div></div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 17 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 17, color: '#FFFFFF' }}>
            <span>Série <b>{currentSet}</b> / {totalSets}</span>
            <span style={{ color: '#555555' }}>·</span>
            <span style={{ display: 'flex', gap: 6 }}>{Array.from({ length: totalSets }).map((_, i) => <i key={i} style={{ width: 14, height: 14, borderRadius: '50%', background: i < currentSet ? ACCENT : '#303030', display: 'block' }} />)}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#161616', display: 'grid', placeItems: 'center' }}>🏆</div>
            <div><div style={{ fontSize: 10.5, fontWeight: 950 }}>Tu avances bien !</div><div style={{ fontSize: 9.5, color: '#929292' }}>Reste concentré.</div></div>
          </div>
        </div>

        {trackingMode === 'weighted_reps' && <LastPerformances exerciseName={ex?.name} userId={user?.id} workoutId={workoutId} completedSets={completedSets.filter(s => s.exercise_name === ex?.name)} />}

        {trackingMode === 'weighted_reps' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <NumberField label="CHARGE (KG)" value={weight} onChange={setWeight} mode="decimal" step={2.5} />
            <NumberField label="RÉPÉTITIONS" value={reps} onChange={setReps} mode="numeric" step={1} />
          </div>
        )}

        {trackingMode === 'bodyweight_reps' && (
          <div style={{ marginBottom: 12 }}>
            <NumberField label="RÉPÉTITIONS" value={reps} onChange={setReps} mode="numeric" step={1} />
          </div>
        )}

        {trackingMode === 'timed' && (
          <div style={{ padding: 22, marginBottom: 14, background: '#111111', border: '1px solid #242424', borderRadius: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#929292', fontWeight: 900, letterSpacing: '.08em', marginBottom: 8 }}>MINUTEUR</div>
            {countdown !== null ? (
              <div style={{ fontSize: 96, lineHeight: 1, fontWeight: 1000, color: ACCENT, marginBottom: 18, animation: 'countPulse .5s ease-out' }}>
                {countdown}
              </div>
            ) : (
              <div style={{ fontSize: 52, lineHeight: 1, fontWeight: 1000, color: exerciseTimer === 0 ? ACCENT : '#FFFFFF', marginBottom: 18 }}>
                {Math.floor(exerciseTimer / 60)}:{String(exerciseTimer % 60).padStart(2, '0')}
              </div>
            )}
            <button type="button" onClick={toggleExerciseTimer} disabled={exerciseTimer === 0 && countdown === null}
              style={{ width: '100%', padding: 15, border: 0, borderRadius: 14, background: exerciseTimer === 0 && countdown === null ? '#202020' : ACCENT, color: exerciseTimer === 0 && countdown === null ? '#777777' : '#080808', fontWeight: 1000, cursor: exerciseTimer === 0 && countdown === null ? 'default' : 'pointer' }}>
              {exerciseTimer === 0 && countdown === null ? '✓ TERMINÉ' : countdown !== null ? 'ANNULER' : exerciseTimerRunning ? 'PAUSE' : 'DÉMARRER'}
            </button>
          </div>
        )}

        {(() => {
          const canValidate = !savingSet && (
            trackingMode === 'timed' ? exerciseTimer === 0
            : trackingMode === 'bodyweight_reps' ? Number(reps) > 0
            : Number(String(weight).replace(',', '.')) >= 0 && Number(reps) > 0
          );
          return (
            <button onClick={validateSet} disabled={!canValidate}
              style={{ width: '100%', padding: 18, background: canValidate ? ACCENT : '#1C1C1C', border: 'none', borderRadius: 18, color: canValidate ? '#080808' : '#666666', fontWeight: 1000, fontSize: 15, cursor: canValidate ? 'pointer' : 'not-allowed', marginBottom: 14 }}>
              {savingSet ? 'ENREGISTREMENT...' : 'VALIDER LA SÉRIE ✓'}
            </button>
          );
        })()}

        <button
          type="button"
          onClick={() => setShowSkipExercise(true)}
          disabled={savingSet}
          style={{ width: '100%', padding: '15px 18px', marginBottom: 14, background: 'transparent', border: '1px solid #2A2A2A', borderRadius: 18, color: '#B5B5B5', fontWeight: 900, fontSize: 11, cursor: savingSet ? 'default' : 'pointer', letterSpacing: '.04em' }}
        >
          PASSER CET EXERCICE →
          <div style={{ marginTop: 4, color: '#666666', fontSize: 9, fontWeight: 700 }}>Si c'est trop dur, tu peux le passer.</div>
        </button>

        {currentIdx < exercises.length - 1 && <div style={{ padding: '15px 16px', background: '#111111', borderRadius: 18, border: '1px solid #242424', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div><div style={{ fontSize: 9, color: '#929292', textTransform: 'uppercase', letterSpacing: '.09em', marginBottom: 5, fontWeight: 900 }}>PROCHAIN EXERCICE</div>
          <div style={{ fontSize: 14, color: '#FFFFFF', fontWeight: 900 }}>{exercises[currentIdx + 1]?.name}</div></div><div style={{ fontSize: 26 }}>›</div>
        </div>}

        {showExerciseFeedback && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 10001, background: 'rgba(0,0,0,.92)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', padding: '0 20px 44px' }}>
            <div style={{ width: '100%', maxWidth: 440 }}>
              <div style={{ textAlign: 'center', marginBottom: 28 }}>
                <div style={{ color: ACCENT, fontSize: 11, fontWeight: 1000, letterSpacing: '.1em', marginBottom: 8 }}>EXERCICE TERMINÉ ✓</div>
                <div style={{ color: '#FFFFFF', fontSize: 26, fontWeight: 1000, letterSpacing: '-.04em' }}>{ex?.name}</div>
                <div style={{ color: '#777', fontSize: 13, marginTop: 6 }}>Comment s'est passé cet exercice ?</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 9, marginBottom: 16 }}>
                {[
                  { value: 'Facile', emoji: '😎', desc: 'Trop facile' },
                  { value: 'Bien', emoji: '💪', desc: 'Juste bien' },
                  { value: 'Difficile', emoji: '🔥', desc: 'Challenge' },
                ].map(({ value, emoji, desc }) => (
                  <button key={value} type="button"
                    onClick={() => setExerciseDifficultyFeedback(exerciseDifficultyFeedback === value ? '' : value)}
                    style={{ padding: '16px 10px', borderRadius: 20, border: exerciseDifficultyFeedback === value ? `2px solid ${ACCENT}` : '1px solid #2A2A2A', background: exerciseDifficultyFeedback === value ? '#1A2800' : '#141414', cursor: 'pointer', textAlign: 'center' }}>
                    <div style={{ fontSize: 28, marginBottom: 6 }}>{emoji}</div>
                    <div style={{ color: '#FFFFFF', fontSize: 12, fontWeight: 1000 }}>{value}</div>
                    <div style={{ color: '#777', fontSize: 9, marginTop: 3 }}>{desc}</div>
                  </button>
                ))}
              </div>

              <button type="button" onClick={() => void confirmExerciseFeedback()}
                style={{ width: '100%', padding: 18, border: 0, borderRadius: 18, background: ACCENT, color: '#080808', fontSize: 14, fontWeight: 1000, cursor: 'pointer' }}>
                {currentIdx >= exercises.length - 1 ? 'TERMINER LA SÉANCE →' : 'EXERCICE SUIVANT →'}
              </button>
              <button type="button" onClick={() => void confirmExerciseFeedback()}
                style={{ width: '100%', marginTop: 8, padding: 14, border: 0, background: 'transparent', color: '#777', fontSize: 10, fontWeight: 900, cursor: 'pointer' }}>
                PASSER SANS NOTER
              </button>
            </div>
          </div>
        )}

        {showSkipExercise && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div style={{ width: '100%', maxWidth: 420, background: '#111111', border: '1px solid #2A2A2A', borderRadius: 26, padding: 24, textAlign: 'center' }}>
              <div style={{ width: 46, height: 46, borderRadius: '50%', border: '2px solid #777', margin: '0 auto 18px', display: 'grid', placeItems: 'center', fontWeight: 1000, fontSize: 20 }}>!</div>
              <div style={{ fontSize: 24, fontWeight: 1000, marginBottom: 8 }}>Passer cet exercice ?</div>
              <div style={{ color: '#929292', fontSize: 13, lineHeight: 1.5, marginBottom: 22 }}>Aucun souci. Les séries déjà réalisées restent enregistrées. NOX passe à l'exercice suivant.</div>
              <button type="button" onClick={skipCurrentExercise} style={{ width: '100%', padding: 16, border: 0, borderRadius: 16, background: ACCENT, color: '#080808', fontWeight: 1000, cursor: 'pointer' }}>OUI, PASSER →</button>
              <button type="button" onClick={() => setShowSkipExercise(false)} style={{ width: '100%', padding: 15, marginTop: 8, border: '1px solid #333333', borderRadius: 16, background: 'transparent', color: '#FFFFFF', fontWeight: 900, cursor: 'pointer' }}>ANNULER</button>
            </div>
          </div>
        )}

        {showDemo && <DemoNox exercise={ex} tags={tags} onClose={() => setShowDemo(false)} />}
      </div>
    )}
  </main>

  <style>{`
    @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes countPulse { from { transform: scale(1.4); opacity: 0.5; } to { transform: scale(1); opacity: 1; } }
    @keyframes spin { to { transform: rotate(360deg); } }
    input::-webkit-outer-spin-button,
    input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
    input[type=number] { -moz-appearance: textfield; }
  `}</style>
</div>

);
}
function NoxBrand({ compact = false, dark = false }: { compact?: boolean; dark?: boolean }) {
return (
<div style={{ display: 'inline-flex', alignItems: 'center', gap: compact ? 6 : 8 }}>
<div style={{ position: 'relative', width: compact ? 23 : 28, height: compact ? 18 : 22, flexShrink: 0 }}>
<span style={{ position: 'absolute', width: compact ? 10 : 13, height: compact ? 6 : 7, left: 1, top: 2, borderRadius: 999, background: ACCENT, transform: 'rotate(28deg)' }} />
<span style={{ position: 'absolute', width: compact ? 18 : 22, height: compact ? 7 : 8, left: compact ? 6 : 7, top: compact ? 9 : 11, borderRadius: 999, background: ACCENT, transform: 'rotate(7deg)' }} />
</div>
<div style={{ display: 'flex', alignItems: 'baseline', gap: 4, color: dark ? '#FFFFFF' : '#111' }}>
<span style={{ fontSize: compact ? 14 : 17, fontWeight: 1000, letterSpacing: '-.045em' }}>NOX</span>
<span style={{ fontSize: compact ? 8 : 9.5, fontWeight: 900, letterSpacing: '.1em', color: dark ? '#929292' : '#66665F' }}>AI</span>
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
    <div style={{ border: '1px solid #242424', borderRadius: 20, padding: '12px 10px 14px', background: '#111111' }}>
      <label style={{ fontSize: 9.5, color: '#929292', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 10, fontWeight: 900 }}>{label}</label>
      <div style={{ display: 'grid', gridTemplateColumns: '42px 1fr 42px', alignItems: 'center', gap: 5 }}>
        <button type="button" onClick={() => changeBy(-step)} style={{ width: 42, height: 42, borderRadius: '50%', border: 0, background: '#1C1C1C', color: '#FFFFFF', fontSize: 24, cursor: 'pointer' }}>−</button>
        <input type="number" value={value} onChange={e => onChange(e.target.value)} placeholder="0" inputMode={mode}
          style={{ width: '100%', border: 0, outline: 'none', background: 'transparent', color: '#FFFFFF', fontSize: 31, fontWeight: 1000, textAlign: 'center', minWidth: 0 }} />
        <button type="button" onClick={() => changeBy(step)} style={{ width: 42, height: 42, borderRadius: '50%', border: 0, background: '#1C1C1C', color: '#FFFFFF', fontSize: 24, cursor: 'pointer' }}>+</button>
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
    <div style={{ position: 'relative', background: '#111111', borderBottom: '1px solid #242424', overflow: 'hidden', padding: '14px 14px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 9.5, color: '#929292', fontWeight: 950, textTransform: 'uppercase', letterSpacing: '.08em' }}>MOUVEMENT</span>
        <span style={{ background: '#1C1C1C', borderRadius: 999, padding: '6px 10px', fontSize: 9, color: '#B0B0B0', fontWeight: 900, textTransform: 'uppercase' }}>{equipment}</span>
      </div>

      <div style={{ position: 'relative', width: '100%', aspectRatio: '4 / 3', maxHeight: 390, minHeight: 235, display: 'grid', placeItems: 'center', background: '#080808', overflow: 'hidden' }}>
        {(() => {
          const exerciseName = nox?.name || exercise?.name;

          const visualPath =
            getExerciseVisualById(exercise?.exercise_id) ||
            getExerciseVisualPath(exercise?.name) ||
            getExerciseVisualPath(nox?.name);
          if (visualPath) {
            return (
              <img
                src={visualPath}
                alt={exerciseName || 'Exercice'}
                style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center' }}
              />
            );
          }
          return (
            <div style={{ display: 'grid', placeItems: 'center', gap: 14, textAlign: 'center', padding: 32 }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#1a1a1a', display: 'grid', placeItems: 'center', fontSize: 30 }}>💪</div>
              <div style={{ fontSize: 12, color: '#666', fontWeight: 600, lineHeight: 1.5 }}>
                {getExerciseMuscles(exerciseName)}
              </div>
            </div>
          );
        })()}
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
        {tags.slice(0, 3).map((tag, index) => <span key={tag} style={{ padding: '6px 9px', borderRadius: 999, background: index === 0 ? '#182000' : '#1C1C1C', border: index === 0 ? `1px solid ${ACCENT}` : '1px solid transparent', fontSize: 9.5, fontWeight: 900, color: index === 0 ? '#FFFFFF' : '#D0D0D0' }}>{tag}</span>)}
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
            <div style={{ fontSize: 9.5, color: '#929292', fontWeight: 900, letterSpacing: '.1em', marginTop: 3 }}>DÉMO NOX</div>
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
          <div style={{ fontSize: 10, color: '#929292', fontWeight: 1000, letterSpacing: '.09em', textTransform: 'uppercase' }}>ÉTAPE {activeStep + 1}</div>
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
      <TutorialTooltip page="training" />
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
<div style={{ fontSize: 8.5, color: '#929292', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 5, fontWeight: 850 }}>DERNIÈRE SÉANCE</div>
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
      <div style={{ fontSize: 8.5, color: '#929292', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4, fontWeight: 850 }}>MEILLEUR PR</div>
      <div style={{ fontSize: 12.5, fontWeight: 900, color: '#111' }}>
        {history[0].weight} kg × {history[0].reps} reps
      </div>
    </div>
  )}

  {completedSets.length > 0 && (
    <div>
      <div style={{ fontSize: 8.5, color: '#929292', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 5, fontWeight: 850 }}>CETTE SÉANCE</div>
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
