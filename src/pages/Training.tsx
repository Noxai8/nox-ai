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
  const matches = normalized.match(/\d+(?:\.\d+)?/g)?.map(Number) || [];
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
  const [restPaused, setRestPaused] = useState(false);
  const [completedSets, setCompletedSets] = useState<any[]>([]);
  const [newPR, setNewPR] = useState<any>(null);
  const [overloadSuggestion, setOverloadSuggestion] = useState<any>(null);
  const [stagnation, setStagnation] = useState<any>(null);
  const [trainingError, setTrainingError] = useState('');
  const [done, setDone] = useState(false);
  const [workoutId, setWorkoutId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingSet, setSavingSet] = useState(false);
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
    setRestPaused(false);
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
    setRestPaused(false);
    setResting(false);
    setRestTime(0);
  };

  const toggleRestPause = () => {
    if (!resting) return;

    if (restPaused) {
      setRestPaused(false);
      clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setRestTime(t => {
          if (t <= 1) {
            clearInterval(timerRef.current);
            setRestPaused(false);
            setResting(false);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
      return;
    }

    clearInterval(timerRef.current);
    setRestPaused(true);
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
      background: '#FFFFFF',
      color: '#111',
      display: 'flex',
      flexDirection: 'column',
      transition: 'background .25s ease, color .25s ease',
    }}>
      <main style={{
        width: '100%',
        maxWidth: 560,
        minHeight: '100vh',
        margin: '0 auto',
        background: '#FFFFFF',
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
                color: '#111', cursor: 'pointer',
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
                color: resting ? '#111' : '#77776F',
                textTransform: 'uppercase',
                letterSpacing: '.08em',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {sessionName}
              </div>
            </div>

            <div style={{ textAlign: 'right', fontSize: 12, fontWeight: 900, color: resting ? '#111' : '#77776F' }}>
              {currentIdx + 1}/{exercises.length}
            </div>
          </div>

          {!resting && (
            <div style={{ height: 6, background: '#ECEEF2', borderRadius: 999, overflow: 'hidden', marginBottom: 20 }}>
              <div style={{ height: '100%', width: `${Math.max(3, exerciseProgress)}%`, background: ACCENT, borderRadius: 999, transition: 'width .4s' }} />
            </div>
          )}
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
            restPaused={restPaused}
            ex={ex}
            currentIdx={currentIdx}
            currentSet={currentSet}
            totalSets={totalSets}
            exercises={exercises}
            onAdd={() => setRestTime(t => t + 15)}
            onSubtract={() => setRestTime(t => Math.max(0, t - 15))}
            onTogglePause={toggleRestPause}
            onSkip={skipRest}
          />
        ) : (
          <div style={{ flex: 1, padding: '0 20px 28px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: '#8A8A83', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 5, fontWeight: 850 }}>
                Exercice {currentIdx + 1}
              </div>
              <div style={{ fontSize: 31, fontWeight: 1000, color: '#111', letterSpacing: '-.045em', lineHeight: .98 }}>
                {ex?.name}
              </div>
            </div>

            <div style={{ borderRadius: 14, overflow: 'hidden', background: '#F0F0EC', marginBottom: 8, border: '1px solid #E7E7E2' }}>
              {media?.image ? (
                <img src={media.image} alt={`Démonstration ${ex?.name || 'exercice'}`} style={{ width: '100%', height: 174, objectFit: 'cover', display: 'block' }} />
              ) : (
                <div style={{ height: 120, display: 'grid', placeItems: 'center', fontWeight: 1000, color: '#B7B7AF' }}>NOX EXERCISE</div>
              )}
            </div>
            {tags.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                {tags.map(tag => <span key={tag} style={{ padding: '5px 9px', background: '#F0F0EC', borderRadius: 8, color: '#55554F', fontSize: 9.5, fontWeight: 750 }}>{tag}</span>)}
              </div>
            )}

            {/* Set indicator */}
            <div style={{ display: 'flex', gap: 7, marginBottom: 14 }}>
              {Array.from({ length: totalSets }).map((_, i) => (
                <div key={i} style={{
                  flex: 1, height: 6, borderRadius: 999,
                  background: i <= currentSet - 1 ? ACCENT : '#E8E8E3',
                  opacity: i === currentSet - 1 ? 1 : i < currentSet - 1 ? .65 : 1,
                  transition: 'background .3s',
                }} />
              ))}
            </div>

            <div style={{ fontSize: 12.5, color: '#77776F', marginBottom: 15 }}>
              Série <span style={{ color: '#111', fontWeight: 1000 }}>{currentSet}</span> / {totalSets}
              {ex?.reps && <span style={{ marginLeft: 8 }}>· Objectif : <span style={{ color: '#111', fontWeight: 950, background: ACCENT, padding: '2px 5px', borderRadius: 5 }}>{ex.reps} reps</span></span>}
            </div>

            <LastPerformances
              exerciseName={ex?.name}
              userId={user?.id}
              workoutId={workoutId}
              completedSets={completedSets.filter(s => s.exercise_name === ex?.name)}
            />

            {/* Inputs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <NumberField
                label="CHARGE (KG)"
                value={weight}
                onChange={setWeight}
                mode="decimal"
              />
              <NumberField
                label="RÉPÉTITIONS"
                value={reps}
                onChange={setReps}
                mode="numeric"
              />
            </div>

            <button
              onClick={() => setWeight(weight === '0' ? '' : '0')}
              style={{
                background: 'transparent', border: 'none',
                color: weight === '0' ? '#111' : '#77776F',
                fontSize: 11.5, cursor: 'pointer', marginBottom: 15,
                textAlign: 'left', padding: '2px 0', fontWeight: weight === '0' ? 850 : 600,
              }}
            >
              <span style={{ color: weight === '0' ? ACCENT : '#AAA', fontWeight: 1000 }}>{weight === '0' ? '●' : '○'}</span>
              {' '}Poids du corps / Sans charge
            </button>

            <button
              onClick={validateSet}
              disabled={!weight || !reps || savingSet}
              style={{
                width: '100%',
                padding: 17,
                background: weight && reps && !savingSet ? ACCENT : '#EFEFEC',
                border: 'none',
                borderRadius: 13,
                color: weight && reps && !savingSet ? '#111' : '#B6B6AF',
                fontWeight: 1000,
                fontSize: 13.5,
                cursor: weight && reps && !savingSet ? 'pointer' : 'not-allowed',
                marginBottom: 12,
                letterSpacing: '.02em',
                transition: 'background .2s, color .2s',
              }}
            >
              {savingSet ? 'ENREGISTREMENT...' : 'VALIDER LA SÉRIE ✓'}
            </button>

            {currentIdx < exercises.length - 1 && (
              <div style={{ marginTop: 3, padding: '13px 14px', background: '#FAFAF8', borderRadius: 12, border: '1px solid #E7E7E2' }}>
                <div style={{ fontSize: 9, color: '#A0A099', textTransform: 'uppercase', letterSpacing: '.09em', marginBottom: 4, fontWeight: 800 }}>PROCHAIN EXERCICE</div>
                <div style={{ fontSize: 12.5, color: '#55554F', fontWeight: 750 }}>{exercises[currentIdx + 1]?.name}</div>
              </div>
            )}
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
  label,
  value,
  onChange,
  mode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  mode: 'decimal' | 'numeric';
}) {
  return (
    <div>
      <label style={{ fontSize: 9.5, color: '#77776F', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 7, fontWeight: 850 }}>
        {label}
      </label>
      <input
        type="number"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="0"
        inputMode={mode}
        style={{
          width: '100%',
          minHeight: 88,
          padding: '14px 10px',
          background: '#FAFAF8',
          border: `1.5px solid ${value ? ACCENT : '#E4E4DF'}`,
          borderRadius: 14,
          color: '#111',
          fontSize: 31,
          fontWeight: 1000,
          textAlign: 'center',
          boxSizing: 'border-box',
          outline: 'none',
        }}
      />
    </div>
  );
}

function RestScreen({
  restTime,
  restMax,
  restPaused,
  ex,
  currentIdx,
  currentSet,
  totalSets,
  exercises,
  onAdd,
  onSubtract,
  onTogglePause,
  onSkip,
}: any) {
  const radius = 82;
  const circumference = 2 * Math.PI * radius;
  const ratio = restMax > 0 ? Math.min(1, Math.max(0, restTime / restMax)) : 0;

  const nextExercise = currentSet <= totalSets
    ? ex
    : currentIdx < exercises.length - 1
      ? exercises[currentIdx + 1]
      : ex;

  const nextLabel = currentSet <= totalSets
    ? `${ex?.name} — Série ${currentSet}`
    : nextExercise?.name;

  const nextMedia = resolveExerciseMedia(nextExercise);
  const completedExerciseCount = Math.max(0, currentIdx);

  return (
    <div style={{ flex: 1, padding: '2px 20px 30px', display: 'flex', flexDirection: 'column', color: '#111' }}>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.max(1, exercises.length)}, 1fr)`, gap: 5, marginBottom: 20 }}>
        {exercises.map((_: any, index: number) => (
          <div
            key={index}
            style={{
              height: 7,
              borderRadius: 999,
              background: index <= completedExerciseCount ? ACCENT : '#E9ECF2',
              transition: 'background .25s ease',
            }}
          />
        ))}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 116px',
        alignItems: 'center',
        gap: 14,
        padding: '18px 18px 17px',
        borderRadius: 24,
        background: 'linear-gradient(135deg, #F7FFE8 0%, #EEFFD0 100%)',
        border: '1px solid #E4F7B9',
        marginBottom: 20,
        boxShadow: '0 12px 34px rgba(31, 45, 0, .06)',
      }}>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: 22, fontWeight: 1000, letterSpacing: '-.035em', marginBottom: 7 }}>Bonne série ! 🎉</div>
          <div style={{ fontSize: 14, lineHeight: 1.42, color: '#62685A', fontWeight: 650 }}>
            Prends ton temps. La prochaine sera encore meilleure.
          </div>
        </div>

        <div style={{ width: 108, height: 88, position: 'relative', justifySelf: 'end' }}>
          <div style={{ position: 'absolute', width: 76, height: 66, right: 8, top: 4, borderRadius: 24, background: '#111', boxShadow: '0 10px 18px rgba(0,0,0,.14)' }}>
            <div style={{ position: 'absolute', left: 17, top: 22, width: 12, height: 7, borderRadius: '50%', borderBottom: `4px solid ${ACCENT}` }} />
            <div style={{ position: 'absolute', right: 17, top: 22, width: 12, height: 7, borderRadius: '50%', borderBottom: `4px solid ${ACCENT}` }} />
            <div style={{ position: 'absolute', left: '50%', bottom: 13, transform: 'translateX(-50%)', color: ACCENT, fontSize: 18, fontWeight: 1000 }}>N</div>
          </div>
          <div style={{ position: 'absolute', right: 0, bottom: 2, width: 34, height: 34, borderRadius: '50%', background: ACCENT, display: 'grid', placeItems: 'center', fontSize: 17, fontWeight: 1000, border: '4px solid #F1FFD6' }}>✓</div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', margin: '2px 0 14px' }}>
        <div style={{ position: 'relative', width: 214, height: 214 }}>
          <svg width="214" height="214" viewBox="0 0 214 214" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="107" cy="107" r={radius} fill="none" stroke="#E9EDF3" strokeWidth="11" />
            <circle
              cx="107" cy="107" r={radius} fill="none" stroke={ACCENT} strokeWidth="11"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - ratio)}
              strokeLinecap="round"
              style={{ transition: restPaused ? 'none' : 'stroke-dashoffset 1s linear', filter: 'drop-shadow(0 3px 7px rgba(183,255,0,.28))' }}
            />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: 12, color: '#9298A3', textTransform: 'uppercase', letterSpacing: '.13em', fontWeight: 900, marginBottom: 7 }}>REPOS</div>
            <div style={{ fontSize: 61, fontWeight: 1000, color: '#111', lineHeight: .9, letterSpacing: '-.06em' }}>{restTime}</div>
            <div style={{ fontSize: 13, color: '#8A909A', marginTop: 11, fontWeight: 650 }}>secondes</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 76px 1fr', gap: 12, width: '100%', maxWidth: 360, alignSelf: 'center', marginBottom: 20 }}>
        <button onClick={onSubtract} style={{ minHeight: 62, borderRadius: 18, border: '1px solid #E1E5EB', background: '#F8F9FB', color: '#111', fontSize: 16, fontWeight: 1000, cursor: 'pointer' }}>−15s</button>
        <button
          onClick={onTogglePause}
          aria-label={restPaused ? 'Reprendre le repos' : 'Mettre le repos en pause'}
          style={{ minHeight: 62, borderRadius: 22, border: 'none', background: ACCENT, color: '#111', fontSize: 24, fontWeight: 1000, cursor: 'pointer', boxShadow: '0 10px 22px rgba(183,255,0,.25)' }}
        >
          {restPaused ? '▶' : 'Ⅱ'}
        </button>
        <button onClick={onAdd} style={{ minHeight: 62, borderRadius: 18, border: '1px solid #E1E5EB', background: '#F8F9FB', color: '#111', fontSize: 16, fontWeight: 1000, cursor: 'pointer' }}>+15s</button>
      </div>

      <div style={{ width: '100%', border: '1px solid #E4E7EC', borderRadius: 22, padding: '15px 16px', display: 'grid', gridTemplateColumns: '1fr 66px 22px', alignItems: 'center', gap: 10, textAlign: 'left', marginBottom: 12, boxShadow: '0 8px 28px rgba(18, 24, 40, .045)' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 9.5, color: '#969CA6', textTransform: 'uppercase', letterSpacing: '.09em', fontWeight: 900, marginBottom: 5 }}>PROCHAIN EXERCICE</div>
          <div style={{ fontSize: 15.5, color: '#111', fontWeight: 1000, lineHeight: 1.15, overflow: 'hidden', textOverflow: 'ellipsis' }}>{nextLabel}</div>
        </div>
        {nextMedia?.image ? (
          <img src={nextMedia.image} alt="Prochain exercice" style={{ width: 62, height: 56, objectFit: 'cover', borderRadius: 13, background: '#F0F1F3' }} />
        ) : (
          <div style={{ width: 62, height: 56, borderRadius: 13, background: '#F1F3F5', display: 'grid', placeItems: 'center', color: '#A3A8B0', fontSize: 10, fontWeight: 1000 }}>NOX</div>
        )}
        <div style={{ fontSize: 25, color: '#111', lineHeight: 1 }}>›</div>
      </div>

      <div style={{ width: '100%', border: '1px solid #E4E7EC', borderRadius: 20, padding: '14px 15px', display: 'grid', gridTemplateColumns: '42px 1fr', gap: 11, textAlign: 'left', marginBottom: 12, background: '#FCFCFD' }}>
        <div style={{ width: 40, height: 40, borderRadius: 13, background: '#E9FFB0', display: 'grid', placeItems: 'center', fontSize: 19 }}>💡</div>
        <div>
          <div style={{ fontSize: 11.5, color: '#111', fontWeight: 1000, marginBottom: 3 }}>Conseil NOX</div>
          <div style={{ fontSize: 11.5, color: '#777E89', lineHeight: 1.42 }}>Respire profondément, hydrate-toi et garde une bonne posture.</div>
        </div>
      </div>

      <div style={{ width: '100%', border: '1px solid #E8EAEF', borderRadius: 20, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
          <div style={{ fontSize: 24 }}>🔥</div>
          <div style={{ fontSize: 11.5, color: '#4E5560', lineHeight: 1.35, fontWeight: 700 }}>Chaque série te rapproche de ton objectif.</div>
        </div>
        <div style={{ flexShrink: 0, background: '#F0FFCF', borderRadius: 999, padding: '8px 10px', color: '#3F6A00', fontSize: 10.5, fontWeight: 1000 }}>TU GÈRES 💪</div>
      </div>

      <button
        onClick={onSkip}
        style={{
          width: '100%',
          minHeight: 60,
          marginTop: 'auto',
          background: ACCENT,
          border: 'none',
          borderRadius: 20,
          color: '#111',
          fontWeight: 1000,
          fontSize: 15,
          cursor: 'pointer',
          boxShadow: '0 10px 28px rgba(183,255,0,.23)',
        }}
      >
        PASSER LE REPOS ▶
      </button>
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
