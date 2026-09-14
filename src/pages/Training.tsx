import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';

const ACCENT = '#c8ff00';
const BG = '#0a0a0a';
const SURFACE = '#111';
const BORDER = '#1a1a1a';

export default function Training() {
  const { sessionId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [exercises, setExercises] = useState<any[]>([]);
  const [currentExerciseIdx, setCurrentExerciseIdx] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [sets, setSets] = useState<any[]>([]);
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [resting, setResting] = useState(false);
  const [restTime, setRestTime] = useState(0);
  const [restMax, setRestMax] = useState(90);
  const [done, setDone] = useState(false);
  const [workoutLogId, setWorkoutLogId] = useState<string|null>(null);
  const [startTime] = useState(Date.now());
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (!user || !sessionId) return;
    const load = async () => {
      const { data: sess } = await supabase.from('program_sessions')
        .select('*, program_exercises(*)')
        .eq('id', sessionId).maybeSingle();
      if (!sess) return;
      setSession(sess);
      const exs = (sess.program_exercises || []).sort((a: any, b: any) => a.order_index - b.order_index);
      setExercises(exs);

      // Créer le workout log
      const { data: log } = await supabase.from('workout_logs').insert({
        user_id: user.id, session_id: sessionId, program_id: sess.program_id,
        started_at: new Date().toISOString(), status: 'in_progress',
      }).select().single();
      if (log) setWorkoutLogId(log.id);
    };
    load();
    return () => clearInterval(timerRef.current);
  }, [user, sessionId]);

  const startRest = (seconds: number) => {
    setRestMax(seconds); setRestTime(seconds); setResting(true);
    timerRef.current = setInterval(() => {
      setRestTime(t => {
        if (t <= 1) { clearInterval(timerRef.current); setResting(false); return 0; }
        return t - 1;
      });
    }, 1000);
  };

  const validateSet = async () => {
    const exercise = exercises[currentExerciseIdx];
    if (!weight || !reps) return;

    const setData = { exercise_id: exercise.id, exercise_name: exercise.name, set_number: currentSet, weight: Number(weight), reps: Number(reps), created_at: new Date().toISOString() };

    // Sauvegarder la série
    if (workoutLogId) {
      await supabase.from('workout_sets').insert({ ...setData, workout_log_id: workoutLogId, user_id: user?.id });
    }

    // Vérifier PR
    const { data: bestSet } = await supabase.from('personal_records')
      .select('weight, reps').eq('user_id', user?.id).eq('exercise_name', exercise.name)
      .eq('type', 'max_weight').maybeSingle();

    if (!bestSet || Number(weight) > bestSet.weight || (Number(weight) === bestSet.weight && Number(reps) > bestSet.reps)) {
      await supabase.from('personal_records').upsert({
        user_id: user?.id, exercise_name: exercise.name, exercise_id: exercise.id,
        type: 'max_weight', weight: Number(weight), reps: Number(reps),
        created_at: new Date().toISOString(),
      }, { onConflict: 'user_id,exercise_name,type' });
    }

    setSets(prev => [...prev, setData]);
    startRest(exercise.rest_seconds || 90);
    setWeight(''); setReps('');

    if (currentSet >= exercise.sets) {
      setCurrentSet(1);
      if (currentExerciseIdx >= exercises.length - 1) {
        finishWorkout();
      } else {
        setCurrentExerciseIdx(idx => idx + 1);
      }
    } else {
      setCurrentSet(s => s + 1);
    }
  };

  const finishWorkout = async () => {
    const duration = Math.round((Date.now() - startTime) / 60000);
    if (workoutLogId) {
      await supabase.from('workout_logs').update({ status: 'completed', finished_at: new Date().toISOString(), duration_minutes: duration }).eq('id', workoutLogId);
    }
    setDone(true);
  };

  if (!session) return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 32, height: 32, border: `2px solid ${ACCENT}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const exercise = exercises[currentExerciseIdx];
  const progress = ((currentExerciseIdx) / exercises.length) * 100;

  if (done) return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>🏆</div>
      <h2 style={{ fontSize: 28, fontWeight: 900, color: '#fff', marginBottom: 8, letterSpacing: '-.025em' }}>SÉANCE TERMINÉE</h2>
      <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20, marginBottom: 32, width: '100%', maxWidth: 320 }}>
        {[
          ['Exercices', exercises.length],
          ['Séries', sets.length],
          ['Volume', sets.reduce((s, set) => s + set.weight * set.reps, 0) + ' kg'],
          ['Durée', Math.round((Date.now() - startTime) / 60000) + ' min'],
        ].map(([k, v]) => (
          <div key={String(k)} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${BORDER}`, fontSize: 14 }}>
            <span style={{ color: '#555' }}>{k}</span>
            <span style={{ color: '#fff', fontWeight: 800 }}>{v}</span>
          </div>
        ))}
      </div>
      <button onClick={() => navigate('/home')} style={{ background: ACCENT, color: BG, border: 'none', borderRadius: 14, padding: '18px 40px', fontSize: 15, fontWeight: 900, cursor: 'pointer' }}>
        RETOUR À L'ACCUEIL
      </button>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: BG, maxWidth: 480, margin: '0 auto', padding: '0 0 24px' }}>
      {/* Header */}
      <div style={{ padding: '20px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>← Quitter</button>
          <div style={{ fontSize: 13, color: '#444', fontWeight: 700 }}>{currentExerciseIdx + 1} / {exercises.length}</div>
        </div>
        <div style={{ height: 3, background: '#1a1a1a', borderRadius: 2, marginBottom: 24 }}>
          <div style={{ height: '100%', background: ACCENT, borderRadius: 2, width: `${progress}%`, transition: 'width .3s' }} />
        </div>
      </div>

      {/* Rest timer */}
      {resting && (
        <div style={{ margin: '0 20px 20px', background: '#0d1a00', border: `1px solid ${ACCENT}`, borderRadius: 20, padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: ACCENT, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 8 }}>REPOS</div>
          <div style={{ fontSize: 52, fontWeight: 900, color: '#fff', marginBottom: 16 }}>{restTime}s</div>
          <div style={{ height: 4, background: '#1a2200', borderRadius: 2, marginBottom: 16 }}>
            <div style={{ height: '100%', background: ACCENT, borderRadius: 2, width: `${(restTime / restMax) * 100}%`, transition: 'width 1s linear' }} />
          </div>
          <button onClick={() => { clearInterval(timerRef.current); setResting(false); }}
            style={{ background: 'transparent', border: `1px solid ${ACCENT}`, borderRadius: 10, padding: '10px 20px', fontSize: 13, color: ACCENT, fontWeight: 700, cursor: 'pointer' }}>
            Passer
          </button>
        </div>
      )}

      {/* Exercise */}
      {!resting && exercise && (
        <div style={{ padding: '0 20px' }}>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#444', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6 }}>{exercise.muscle_group}</div>
            <h2 style={{ fontSize: 26, fontWeight: 900, color: '#fff', marginBottom: 4, letterSpacing: '-.02em' }}>{exercise.name}</h2>
            <div style={{ fontSize: 14, color: '#555' }}>Objectif : {exercise.sets} × {exercise.reps}</div>
          </div>

          {/* Série en cours */}
          <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20, marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: '#444', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 16 }}>
              Série {currentSet} / {exercise.sets}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: '#555', fontWeight: 700, display: 'block', marginBottom: 8 }}>CHARGE (kg)</label>
                <input value={weight} onChange={e => setWeight(e.target.value)} type="number" placeholder="80"
                  style={{ background: '#0d0d0d', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '14px', fontSize: 22, fontWeight: 900, color: '#fff', outline: 'none', width: '100%', textAlign: 'center' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#555', fontWeight: 700, display: 'block', marginBottom: 8 }}>REPS</label>
                <input value={reps} onChange={e => setReps(e.target.value)} type="number" placeholder="8"
                  style={{ background: '#0d0d0d', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '14px', fontSize: 22, fontWeight: 900, color: '#fff', outline: 'none', width: '100%', textAlign: 'center' }} />
              </div>
            </div>
          </div>

          {/* Historique des séries */}
          {sets.filter(s => s.exercise_name === exercise.name).length > 0 && (
            <div style={{ background: '#0d0d0d', borderRadius: 12, padding: 12, marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: '#333', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>Cette séance</div>
              {sets.filter(s => s.exercise_name === exercise.name).map((s, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13, color: '#555' }}>
                  <span>Série {s.set_number}</span>
                  <span style={{ color: '#fff', fontWeight: 700 }}>{s.weight} kg × {s.reps}</span>
                </div>
              ))}
            </div>
          )}

          <button onClick={validateSet} disabled={!weight || !reps}
            style={{ width: '100%', background: weight && reps ? ACCENT : '#1a1a1a', color: weight && reps ? BG : '#333', border: 'none', borderRadius: 14, padding: '18px', fontSize: 15, fontWeight: 900, cursor: weight && reps ? 'pointer' : 'not-allowed' }}>
            VALIDER LA SÉRIE
          </button>
        </div>
      )}
    </div>
  );
}
