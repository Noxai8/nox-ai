import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';

const ACCENT = '#c8ff00';
const BG = '#0a0a0a';
const SURFACE = '#111';
const BORDER = '#1a1a1a';

const RPE_LABELS = ['', 'Très facile', 'Facile', 'Modéré', 'Difficile', 'Très difficile', 'Limite max'];

export default function BeginnerCalibration() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<any>(null);
  const [program, setProgram] = useState<any>(null);
  const [calibrations, setCalibrations] = useState<Record<string, { weight: number; rpe: number }>>({});
  const [currentExercise, setCurrentExercise] = useState<any>(null);
  const [weight, setWeight] = useState('');
  const [rpe, setRpe] = useState(0);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => { if (user) load(); }, [user]);

  const load = async () => {
    const [{ data: prof }, { data: prog }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user!.id).maybeSingle(),
      supabase.from('workout_programs').select('*').eq('user_id', user!.id).eq('is_active', true).maybeSingle(),
    ]);
    setProfile(prof);
    setProgram(prog);

    // Extraire les exercices composés de la première séance
    const sessions = prog?.program_json?.sessions || [];
    const firstSession = sessions[0];
    const compoundExercises = firstSession?.exercises?.filter((e: any) =>
      ['développé', 'squat', 'soulevé', 'rowing', 'tractions', 'overhead', 'press', 'deadlift', 'bench', 'pull'].some(kw =>
        e.name.toLowerCase().includes(kw)
      )
    ).slice(0, 4) || [];

    if (compoundExercises.length > 0) {
      setCurrentExercise(compoundExercises[step] || compoundExercises[0]);
    }
  };

  const exercises = program?.program_json?.sessions?.[0]?.exercises?.filter((e: any) =>
    ['développé', 'squat', 'soulevé', 'rowing', 'tractions', 'overhead', 'press', 'deadlift', 'bench', 'pull'].some(kw =>
      e.name.toLowerCase().includes(kw)
    )
  ).slice(0, 4) || [];

  const saveCalibration = async () => {
    if (!weight || !rpe) return;
    setSaving(true);

    const newCalibrations = {
      ...calibrations,
      [currentExercise.name]: { weight: parseFloat(weight), rpe },
    };
    setCalibrations(newCalibrations);

    if (step < exercises.length - 1) {
      setStep(s => s + 1);
      setCurrentExercise(exercises[step + 1]);
      setWeight('');
      setRpe(0);
    } else {
      // Ajuster les charges du programme selon le RPE réel
      await applyCalibrations(newCalibrations);
      setDone(true);
    }
    setSaving(false);
  };

  const applyCalibrations = async (cals: Record<string, { weight: number; rpe: number }>) => {
    if (!program?.program_json) return;

    const updatedSessions = program.program_json.sessions.map((session: any) => ({
      ...session,
      exercises: session.exercises.map((ex: any) => {
        const cal = cals[ex.name];
        if (!cal) return ex;

        // Ajuster la charge selon le RPE
        // RPE 5-6 (trop facile) → +10%
        // RPE 7-8 (bien) → garder
        // RPE 9-10 (trop dur) → -15%
        let adjustedWeight = cal.weight;
        if (cal.rpe <= 3) adjustedWeight = Math.round(cal.weight * 1.15 / 2.5) * 2.5;
        else if (cal.rpe <= 5) adjustedWeight = Math.round(cal.weight * 1.08 / 2.5) * 2.5;
        else if (cal.rpe >= 6) adjustedWeight = Math.round(cal.weight * 0.85 / 2.5) * 2.5;

        return {
          ...ex,
          weight_suggestion: `${adjustedWeight}kg`,
          calibrated: true,
          calibration_rpe: cal.rpe,
        };
      }),
    }));

    await supabase.from('workout_programs').update({
      program_json: {
        ...program.program_json,
        sessions: updatedSessions,
        calibration_done: true,
        calibration_date: new Date().toISOString(),
      },
    }).eq('id', program.id);

    await supabase.from('profiles').update({ calibration_completed: true }).eq('id', user!.id);
  };

  if (done) return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center' }}>
      <div style={{ fontSize: 72, marginBottom: 24 }}>✅</div>
      <div style={{ fontSize: 24, fontWeight: 900, color: '#fff', marginBottom: 12 }}>CALIBRATION TERMINÉE</div>
      <div style={{ fontSize: 14, color: '#555', lineHeight: 1.6, marginBottom: 32, maxWidth: 300 }}>
        NOX a ajusté tes charges selon ton niveau réel. Ton programme est maintenant calibré pour toi.
      </div>
      <div style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 16, padding: 20, marginBottom: 32, width: '100%', maxWidth: 320 }}>
        {Object.entries(calibrations).map(([name, cal]) => (
          <div key={name} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #1a1a1a' }}>
            <div style={{ fontSize: 13, color: '#888' }}>{name}</div>
            <div style={{ fontSize: 13, color: ACCENT, fontWeight: 700 }}>{cal.weight}kg · RPE {cal.rpe}</div>
          </div>
        ))}
      </div>
      <button onClick={() => navigate('/program')}
        style={{ width: '100%', maxWidth: 320, padding: 18, background: ACCENT, border: 'none', borderRadius: 14, color: '#000', fontWeight: 900, fontSize: 15, cursor: 'pointer' }}>
        VOIR MON PROGRAMME →
      </button>
    </div>
  );

  if (!currentExercise) return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#555' }}>Chargement...</div>
    </div>
  );

  const progress = ((step / Math.max(exercises.length, 1)) * 100);

  return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '20px 20px 0', flexShrink: 0 }}>
        <button onClick={() => navigate('/home')} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 14, marginBottom: 16 }}>← Retour</button>
        <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 4 }}>Semaine 1 · Calibration</div>
        <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', marginBottom: 16 }}>TROUVE TES VRAIES CHARGES</div>
        <div style={{ height: 4, background: '#1a1a1a', borderRadius: 2, overflow: 'hidden', marginBottom: 20 }}>
          <div style={{ height: '100%', width: progress + '%', background: ACCENT, borderRadius: 2, transition: 'width .4s' }} />
        </div>
        <div style={{ fontSize: 12, color: '#555', marginBottom: 20 }}>Exercice {step + 1} / {exercises.length}</div>
      </div>

      <div style={{ flex: 1, padding: '0 20px' }}>
        <div style={{ fontSize: 26, fontWeight: 900, color: '#fff', marginBottom: 6 }}>{currentExercise.name}</div>
        {currentExercise.muscles && <div style={{ fontSize: 13, color: '#555', marginBottom: 24 }}>🎯 {currentExercise.muscles}</div>}

        <div style={{ background: ACCENT + '11', border: '1px solid ' + ACCENT + '33', borderRadius: 14, padding: 16, marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: ACCENT, marginBottom: 8 }}>PROTOCOLE CALIBRATION</div>
          <div style={{ fontSize: 13, color: '#ccc', lineHeight: 1.6 }}>
            1. Choisis une charge que tu penses pouvoir faire 10 fois<br />
            2. Fais {currentExercise.reps || '8-10'} répétitions<br />
            3. Note ton effort réel ci-dessous<br />
            NOX ajustera ta charge pour les prochaines séances.
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, color: '#555', textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: 8 }}>Charge utilisée (kg)</label>
          <input type="number" value={weight} onChange={e => setWeight(e.target.value)} placeholder="ex: 60" inputMode="decimal"
            style={{ width: '100%', padding: '18px 16px', background: SURFACE, border: '2px solid ' + (weight ? ACCENT + '66' : BORDER), borderRadius: 14, color: '#fff', fontSize: 32, fontWeight: 900, textAlign: 'center', boxSizing: 'border-box', outline: 'none' }} />
        </div>

        <div style={{ marginBottom: 32 }}>
          <label style={{ fontSize: 12, color: '#555', textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: 8 }}>
            Effort perçu (RPE) {rpe > 0 && <span style={{ color: ACCENT }}>— {RPE_LABELS[rpe]}</span>}
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
            {[1, 2, 3, 4, 5, 6].map(v => (
              <button key={v} onClick={() => setRpe(v)}
                style={{ padding: '14px 0', background: rpe === v ? ACCENT : SURFACE, border: '1px solid ' + (rpe === v ? ACCENT : BORDER), borderRadius: 10, color: rpe === v ? '#000' : '#fff', fontWeight: 900, fontSize: 18, cursor: 'pointer', transition: 'all .2s' }}>
                {v}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            <span style={{ fontSize: 10, color: '#333' }}>Très facile</span>
            <span style={{ fontSize: 10, color: '#333' }}>Limite max</span>
          </div>
        </div>

        <button onClick={saveCalibration} disabled={!weight || !rpe || saving}
          style={{ width: '100%', padding: 18, background: weight && rpe ? ACCENT : '#1a1a1a', border: 'none', borderRadius: 14, color: weight && rpe ? '#000' : '#333', fontWeight: 900, fontSize: 15, cursor: weight && rpe ? 'pointer' : 'not-allowed' }}>
          {step < exercises.length - 1 ? 'EXERCICE SUIVANT →' : 'TERMINER LA CALIBRATION ✓'}
        </button>
      </div>
    </div>
  );
}
