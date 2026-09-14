import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { calculateTrainingStreak, parseRestSeconds } from '../lib/trainingLogic';

const ACCENT = '#c8ff00';
const BG = '#0a0a0a';
const SURFACE = '#111';
const BORDER = '#1a1a1a';

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
    // Charger le programme actif depuis workout_programs
    const { data: prog } = await supabase
      .from('workout_programs')
      .select('*')
      .eq('user_id', user!.id)
      .eq('is_active', true)
      .maybeSingle();

    if (!prog?.program_json) {
      setLoading(false);
      return;
    }

    const sessions: any[] = prog.program_json.sessions || [];
    let session: any = null;

    // Trouver la séance par index ou par nom
    const idx = parseInt(sessionId || '0');
    if (!isNaN(idx) && sessions[idx]) {
      session = sessions[idx];
    } else {
      // Chercher par jour ou nom
      const days = ['DIM', 'LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM'];
      const todayDay = days[new Date().getDay()];
      session = sessions.find((s: any) => s.day === todayDay || s.id === sessionId) || sessions[0];
    }

    if (!session) {
      setLoading(false);
      return;
    }

    setSessionName(session.name || 'SÉANCE');
    setExercises(session.exercises || []);

    // Reprendre une séance en cours aujourd'hui si elle existe déjà.
    // Cela évite de créer plusieurs workouts lors d'un simple refresh.
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);

    const { data: existingWorkout } = await supabase
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

    if (existingWorkout?.id) {
      setWorkoutId(existingWorkout.id);
    } else {
      const { data: wk } = await supabase.from('workouts').insert({
        user_id: user!.id,
        program_id: prog.id,
        name: session.name,
        started_at: new Date().toISOString(),
        status: 'in_progress',
        created_at: new Date().toISOString(),
      }).select().maybeSingle();

      if (wk) setWorkoutId(wk.id);
    }

    setLoading(false);
  };

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
    if (savingSet) return;
    const ex = exercises[currentIdx];
    if (!weight || !reps) return;

    setSavingSet(true);

    const setData = {
      exercise_name: ex.name,
      set_number: currentSet,
      weight: Number(weight),
      reps: Number(reps),
    };

    // Vérifier PR
    const { data: best } = await supabase
      .from('personal_records')
      .select('*')
      .eq('user_id', user!.id)
      .eq('exercise_name', ex.name)
      .maybeSingle();

    const isPR = !best ||
      Number(weight) > (best.weight || 0) ||
      (Number(weight) === best.weight && Number(reps) > (best.reps || 0));

    if (isPR) {
      await supabase.from('personal_records').upsert({
        user_id: user!.id,
        exercise_name: ex.name,
        weight: Number(weight),
        reps: Number(reps),
        created_at: new Date().toISOString(),
      }, { onConflict: 'user_id,exercise_name' });
      setNewPR({ name: ex.name, weight: Number(weight), reps: Number(reps) });
      setTimeout(() => setNewPR(null), 3000);
    }

    setCompletedSets(prev => [...prev, setData]);

    const totalSets = parseInt(ex.sets) || 3;
    const restSecs = parseRestSeconds(ex.rest);

    if (currentSet >= totalSets) {
      // Exercice terminé
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
    setSavingSet(false);
  };

  const finishWorkout = async () => {
    if (finishingRef.current) return;
    finishingRef.current = true;

    try {
      const duration = Math.max(1, Math.round((Date.now() - startTime) / 60000));
      if (workoutId) {
        await supabase.from('workouts').update({
          status: 'completed',
          finished_at: new Date().toISOString(),
          duration_minutes: duration,
        }).eq('id', workoutId).eq('status', 'in_progress');
      }

      // Recalcul du streak à partir des vraies séances complétées.
      // Plusieurs entraînements le même jour ne comptent donc qu'une fois.
      const { data: completedWorkouts } = await supabase
        .from('workouts')
        .select('finished_at, started_at')
        .eq('user_id', user!.id)
        .eq('status', 'completed')
        .order('started_at', { ascending: false })
        .limit(120);

      const streak = calculateTrainingStreak(
        (completedWorkouts || [])
          .map((w: any) => w.finished_at || w.started_at)
          .filter(Boolean),
      );

      const { data: profile } = await supabase
        .from('profiles')
        .select('xp')
        .eq('id', user!.id)
        .maybeSingle();

      await supabase.from('profiles').update({
        streak_days: streak,
        xp: (profile?.xp || 0) + 50,
      }).eq('id', user!.id);

      setDone(true);
    } finally {
      finishingRef.current = false;
    }
  };

  const abandonWorkout = async () => {
    if (workoutId) {
      // Aucun détail de série n'est encore persisté dans cette version.
      // Supprimer le workout in_progress évite qu'il pollue l'historique.
      await supabase
        .from('workouts')
        .delete()
        .eq('id', workoutId)
        .eq('user_id', user!.id)
        .eq('status', 'in_progress');
    }
    navigate('/home');
  };

  // ─── LOADING ────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 40, height: 40, border: '3px solid #1a1a1a', borderTop: '3px solid ' + ACCENT, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <div style={{ color: '#555', fontSize: 13 }}>Chargement de la séance...</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (!exercises.length) return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>😅</div>
      <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', marginBottom: 8 }}>Séance introuvable</div>
      <div style={{ fontSize: 14, color: '#555', marginBottom: 24 }}>Génère d'abord un programme depuis l'onglet Training.</div>
      <button onClick={() => navigate('/generate-program')}
        style={{ padding: '14px 28px', background: ACCENT, border: 'none', borderRadius: 14, color: '#000', fontWeight: 900, cursor: 'pointer' }}>
        CRÉER UN PROGRAMME
      </button>
    </div>
  );

  // ─── DONE ───────────────────────────────────────────────────
  if (done) {
    const duration = Math.round((Date.now() - startTime) / 60000);
    const prCount = completedSets.filter((s, i, arr) =>
      arr.findIndex(x => x.exercise_name === s.exercise_name && x.weight >= s.weight) === i
    ).length;

    return (
      <div style={{ minHeight: '100vh', background: BG, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 72, marginBottom: 24 }}>⚡</div>
        <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.15em', marginBottom: 8 }}>Complété</div>
        <div style={{ fontSize: 28, fontWeight: 900, color: '#fff', marginBottom: 32 }}>SÉANCE TERMINÉE</div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, width: '100%', maxWidth: 320, marginBottom: 32 }}>
          {[
            { label: 'Durée', value: duration + ' min', icon: '⏱️' },
            { label: 'Exercices', value: exercises.length, icon: '🏋️' },
            { label: 'Séries', value: completedSets.length, icon: '📊' },
          ].map(({ label, value, icon }) => (
            <div key={label} style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 14, padding: '14px 8px' }}>
              <div style={{ fontSize: 24 }}>{icon}</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', marginTop: 4 }}>{value}</div>
              <div style={{ fontSize: 10, color: '#555', textTransform: 'uppercase', marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>

        <div style={{ background: ACCENT + '11', border: '1px solid ' + ACCENT + '33', borderRadius: 14, padding: 16, marginBottom: 32, width: '100%', maxWidth: 320 }}>
          <div style={{ fontSize: 13, color: ACCENT, fontWeight: 800 }}>+50 XP · Streak recalculé 🔥</div>
        </div>

        <button onClick={() => navigate('/home')}
          style={{ width: '100%', maxWidth: 320, padding: 18, background: ACCENT, border: 'none', borderRadius: 16, color: '#000', fontWeight: 900, fontSize: 16, cursor: 'pointer' }}>
          RETOUR À L'ACCUEIL
        </button>
      </div>
    );
  }

  const ex = exercises[currentIdx];
  const totalSets = parseInt(ex?.sets) || 3;
  const progress = ((currentIdx / exercises.length) * 100);

  return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '20px 20px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <button onClick={() => { if (confirm('Abandonner la séance ?')) void abandonWorkout(); }}
            style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 22 }}>×</button>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#555', textTransform: 'uppercase', letterSpacing: '.08em' }}>{sessionName}</div>
          <div style={{ fontSize: 12, color: '#555' }}>{currentIdx + 1}/{exercises.length}</div>
        </div>
        {/* Progress bar */}
        <div style={{ height: 3, background: '#1a1a1a', borderRadius: 2, overflow: 'hidden', marginBottom: 20 }}>
          <div style={{ height: '100%', width: progress + '%', background: ACCENT, borderRadius: 2, transition: 'width .4s' }} />
        </div>
      </div>

      {/* PR Banner */}
      {newPR && (
        <div style={{ margin: '0 20px 12px', background: ACCENT, borderRadius: 14, padding: '12px 16px', textAlign: 'center', animation: 'fadeIn .3s' }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#000' }}>🏆 NOUVEAU RECORD !</div>
          <div style={{ fontSize: 14, color: '#000', marginTop: 4 }}>{newPR.name} — {newPR.weight}kg × {newPR.reps}</div>
        </div>
      )}

      {/* REST SCREEN */}
      {resting ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: '#555', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 16 }}>REPOS</div>

          {/* Timer circle */}
          <div style={{ position: 'relative', width: 160, height: 160, marginBottom: 32 }}>
            <svg width="160" height="160" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="80" cy="80" r="70" fill="none" stroke="#1a1a1a" strokeWidth="8" />
              <circle cx="80" cy="80" r="70" fill="none" stroke={ACCENT} strokeWidth="8"
                strokeDasharray={`${2 * Math.PI * 70}`}
                strokeDashoffset={`${2 * Math.PI * 70 * (1 - restTime / restMax)}`}
                strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s linear' }} />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: 48, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{restTime}</div>
              <div style={{ fontSize: 12, color: '#555', marginTop: 4 }}>secondes</div>
            </div>
          </div>

          <div style={{ fontSize: 14, color: '#555', marginBottom: 8 }}>
            Prochain : <span style={{ color: '#fff', fontWeight: 700 }}>
              {currentIdx < exercises.length - 1
                ? (currentSet > totalSets ? exercises[currentIdx + 1]?.name : ex?.name + ` — Série ${currentSet}`)
                : ex?.name + ` — Série ${currentSet}`}
            </span>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
            <button onClick={() => setRestTime(t => t + 15)}
              style={{ padding: '12px 20px', background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 12, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              +15s
            </button>
            <button onClick={skipRest}
              style={{ padding: '12px 28px', background: ACCENT, border: 'none', borderRadius: 12, color: '#000', fontWeight: 900, fontSize: 14, cursor: 'pointer' }}>
              PASSER ▶
            </button>
          </div>
        </div>
      ) : (
        /* EXERCISE SCREEN */
        <div style={{ flex: 1, padding: '0 20px', display: 'flex', flexDirection: 'column' }}>
          {/* Exercise name */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 4 }}>
              Exercice {currentIdx + 1}
            </div>
            <div style={{ fontSize: 26, fontWeight: 900, color: '#fff', letterSpacing: '-.02em', lineHeight: 1.1 }}>
              {ex?.name}
            </div>
            {ex?.muscles && <div style={{ fontSize: 13, color: '#555', marginTop: 6 }}>🎯 {ex.muscles}</div>}
          </div>

          {/* Set indicator */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {Array.from({ length: totalSets }).map((_, i) => (
              <div key={i} style={{
                flex: 1, height: 6, borderRadius: 3,
                background: i < currentSet - 1 ? ACCENT : i === currentSet - 1 ? ACCENT + '88' : '#1a1a1a',
                transition: 'background .3s'
              }} />
            ))}
          </div>
          <div style={{ fontSize: 13, color: '#555', marginBottom: 20 }}>
            Série <span style={{ color: '#fff', fontWeight: 900 }}>{currentSet}</span> / {totalSets}
            {ex?.reps && <span style={{ marginLeft: 8 }}>· Objectif : <span style={{ color: ACCENT, fontWeight: 700 }}>{ex.reps} reps</span></span>}
          </div>

          {/* Dernières performances */}
          <LastPerformances exerciseName={ex?.name} userId={user?.id} completedSets={completedSets.filter(s => s.exercise_name === ex?.name)} />

          {/* Inputs */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: 8 }}>Charge (kg)</label>
              <input
                type="number" value={weight} onChange={e => setWeight(e.target.value)}
                placeholder="0" inputMode="decimal"
                style={{ width: '100%', padding: '18px 16px', background: SURFACE, border: '2px solid ' + (weight ? ACCENT + '66' : BORDER), borderRadius: 14, color: '#fff', fontSize: 28, fontWeight: 900, textAlign: 'center', boxSizing: 'border-box', outline: 'none' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: 8 }}>Répétitions</label>
              <input
                type="number" value={reps} onChange={e => setReps(e.target.value)}
                placeholder="0" inputMode="numeric"
                style={{ width: '100%', padding: '18px 16px', background: SURFACE, border: '2px solid ' + (reps ? ACCENT + '66' : BORDER), borderRadius: 14, color: '#fff', fontSize: 28, fontWeight: 900, textAlign: 'center', boxSizing: 'border-box', outline: 'none' }}
              />
            </div>
          </div>

          {/* Poids du corps toggle */}
          <button onClick={() => setWeight(weight === '0' ? '' : '0')}
            style={{ background: 'transparent', border: 'none', color: '#444', fontSize: 12, cursor: 'pointer', marginBottom: 16, textAlign: 'left' }}>
            {weight === '0' ? '✓ ' : '○ '} Poids du corps / Sans charge
          </button>

          {/* Validate */}
          <button onClick={validateSet} disabled={!weight || !reps || savingSet}
            style={{ width: '100%', padding: 18, background: weight && reps && !savingSet ? ACCENT : '#1a1a1a', border: 'none', borderRadius: 16, color: weight && reps && !savingSet ? '#000' : '#333', fontWeight: 900, fontSize: 16, cursor: weight && reps && !savingSet ? 'pointer' : 'not-allowed', marginBottom: 12, letterSpacing: '.03em', transition: 'background .2s' }}>
            {savingSet ? 'ENREGISTREMENT...' : 'VALIDER LA SÉRIE ✓'}
          </button>

          {/* Next exercises */}
          {currentIdx < exercises.length - 1 && (
            <div style={{ marginTop: 8, padding: '12px 14px', background: SURFACE, borderRadius: 12, border: '1px solid ' + BORDER }}>
              <div style={{ fontSize: 10, color: '#333', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>PROCHAIN EXERCICE</div>
              <div style={{ fontSize: 13, color: '#888' }}>{exercises[currentIdx + 1]?.name}</div>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}

// ─── LAST PERFORMANCES ──────────────────────────────────────────
function LastPerformances({ exerciseName, userId, completedSets }: any) {
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    if (!exerciseName || !userId) return;
    supabase.from('personal_records')
      .select('weight, reps, created_at')
      .eq('user_id', userId)
      .eq('exercise_name', exerciseName)
      .order('created_at', { ascending: false })
      .limit(1)
      .then(({ data }) => setHistory(data || []));
  }, [exerciseName, userId]);

  if (history.length === 0 && completedSets.length === 0) return null;

  return (
    <div style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 12, padding: '10px 14px', marginBottom: 16 }}>
      {history[0] && (
        <div style={{ marginBottom: completedSets.length > 0 ? 8 : 0 }}>
          <div style={{ fontSize: 10, color: '#333', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>MEILLEUR PR</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#c8ff00' }}>
            {history[0].weight}kg × {history[0].reps} reps
          </div>
        </div>
      )}
      {completedSets.length > 0 && (
        <div>
          <div style={{ fontSize: 10, color: '#333', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>CETTE SÉANCE</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {completedSets.map((s: any, i: number) => (
              <div key={i} style={{ background: '#1a1a1a', borderRadius: 8, padding: '4px 10px', fontSize: 12, color: '#ccc' }}>
                {s.weight}kg×{s.reps}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
