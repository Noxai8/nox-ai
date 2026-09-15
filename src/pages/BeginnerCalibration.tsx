import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from './Home';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';

const ACCENT = '#c8ff00';
const BG = '#0a0a0a';
const SURFACE = '#111';
const BORDER = '#1a1a1a';

const RPE_LABELS = ['', 'Très facile', 'Facile', 'Modéré', 'Difficile', 'Très difficile', 'Limite max'];

type Calibration = { weight: number; rpe: number };

export default function BeginnerCalibration() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<any>(null);
  const [program, setProgram] = useState<any>(null);
  const [calibrations, setCalibrations] = useState<Record<string, Calibration>>({});
  const [weight, setWeight] = useState('');
  const [rpe, setRpe] = useState(0);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) load();
  }, [user]);

  const getCalibrationExercises = (prog: any) => {
    const sessions = prog?.program_json?.sessions || [];
    const allExercises = sessions.flatMap((session: any) => session?.exercises || []);

    const compounds = allExercises.filter((e: any) => {
      const name = String(e?.name || '').toLowerCase();
      return ['développé', 'squat', 'soulevé', 'rowing', 'tractions', 'overhead', 'press', 'deadlift', 'bench', 'pull', 'presse'].some(kw =>
        name.includes(kw)
      );
    });

    const unique = compounds.filter(
      (exercise: any, index: number, array: any[]) =>
        array.findIndex(other => String(other?.name || '').toLowerCase() === String(exercise?.name || '').toLowerCase()) === index
    );

    // Si le programme ne contient pas assez de mouvements détectés comme composés,
    // NOX complète avec les premiers exercices disponibles au lieu de bloquer la page.
    const fallback = allExercises.filter(
      (exercise: any) =>
        !unique.some((u: any) => String(u?.name || '').toLowerCase() === String(exercise?.name || '').toLowerCase())
    );

    return [...unique, ...fallback].slice(0, 4);
  };

  const load = async () => {
    if (!user) return;

    setLoading(true);
    setError('');

    try {
      const [{ data: prof, error: profileError }, { data: prog, error: programError }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
        supabase.from('workout_programs').select('*').eq('user_id', user.id).eq('is_active', true).maybeSingle(),
      ]);

      if (profileError) throw profileError;
      if (programError) throw programError;

      setProfile(prof);
      setProgram(prog);

      if (!prog?.program_json?.sessions?.length) {
        setError("NOX n'a pas encore trouvé de programme actif à calibrer.");
      }
    } catch (e: any) {
      console.error(e);
      setError(e?.message || 'Impossible de charger ta calibration.');
    } finally {
      setLoading(false);
    }
  };

  const exercises = useMemo(() => getCalibrationExercises(program), [program]);
  const currentExercise = exercises[step] || null;

  const progress = exercises.length
    ? Math.round((Object.keys(calibrations).length / exercises.length) * 100)
    : 0;

  const learningItems = [
    {
      title: 'Tes charges réelles',
      text: 'NOX compare la charge utilisée avec ton effort perçu pour éviter de démarrer trop lourd ou trop léger.',
      done: Object.keys(calibrations).length >= 1,
    },
    {
      title: 'Ta tolérance à l’effort',
      text: 'Tes premières séances permettent de mieux situer les charges que tu peux répéter avec une technique propre.',
      done: Object.keys(calibrations).length >= Math.min(2, exercises.length),
    },
    {
      title: 'Ton rythme de progression',
      text: 'Après plusieurs séances, NOX pourra utiliser tes performances réelles pour guider les prochaines progressions.',
      done: false,
    },
    {
      title: 'Ta récupération',
      text: 'Tes check-ins de récupération complètent la calibration pour éviter de confondre fatigue ponctuelle et niveau réel.',
      done: Boolean(profile?.calibration_completed),
    },
  ];

  const saveCalibration = async () => {
    if (!currentExercise || !weight || !rpe || saving) return;

    const parsedWeight = Number(String(weight).replace(',', '.'));
    if (!Number.isFinite(parsedWeight) || parsedWeight <= 0) {
      setError('Entre une charge valide supérieure à 0 kg.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const newCalibrations = {
        ...calibrations,
        [currentExercise.name]: { weight: parsedWeight, rpe },
      };

      setCalibrations(newCalibrations);

      if (step < exercises.length - 1) {
        setStep(current => current + 1);
        setWeight('');
        setRpe(0);
      } else {
        await applyCalibrations(newCalibrations);
        setDone(true);
      }
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Impossible d'enregistrer la calibration.");
    } finally {
      setSaving(false);
    }
  };

  const applyCalibrations = async (cals: Record<string, Calibration>) => {
    if (!program?.program_json || !user) {
      throw new Error('Programme actif introuvable.');
    }

    const updatedSessions = program.program_json.sessions.map((session: any) => ({
      ...session,
      exercises: (session.exercises || []).map((ex: any) => {
        const cal = cals[ex.name];
        if (!cal) return ex;

        let adjustedWeight = cal.weight;

        // L'échelle historique de cette page va de 1 à 6.
        // 1-2 = nettement trop facile, 3-4 = zone exploitable, 5-6 = trop difficile.
        if (cal.rpe <= 2) adjustedWeight = Math.round((cal.weight * 1.1) / 2.5) * 2.5;
        else if (cal.rpe >= 5) adjustedWeight = Math.round((cal.weight * 0.9) / 2.5) * 2.5;

        return {
          ...ex,
          weight_suggestion: `${Math.max(0, adjustedWeight)}kg`,
          calibrated: true,
          calibration_rpe: cal.rpe,
          calibration_weight: cal.weight,
        };
      }),
    }));

    const { error: programUpdateError } = await supabase
      .from('workout_programs')
      .update({
        program_json: {
          ...program.program_json,
          sessions: updatedSessions,
          calibration_done: true,
          calibration_date: new Date().toISOString(),
          calibration_exercises: cals,
        },
      })
      .eq('id', program.id)
      .eq('user_id', user.id);

    if (programUpdateError) throw programUpdateError;

    const { error: profileUpdateError } = await supabase
      .from('profiles')
      .update({ calibration_completed: true })
      .eq('id', user.id);

    if (profileUpdateError) throw profileUpdateError;
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: ACCENT, fontWeight: 900, letterSpacing: '.12em' }}>NOX CALIBRE...</div>
      </div>
    );
  }

  if (done) {
    return (
      <div style={{ minHeight: '100vh', background: BG, padding: '34px 20px 100px' }}>
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          <div style={{ width: 52, height: 52, borderRadius: 16, background: ACCENT, color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 1000, fontSize: 24, marginBottom: 22 }}>
            ✓
          </div>

          <div style={{ fontSize: 11, color: ACCENT, fontWeight: 900, letterSpacing: '.12em', marginBottom: 7 }}>PREMIÈRE CALIBRATION TERMINÉE</div>
          <div style={{ fontSize: 28, lineHeight: 1.05, fontWeight: 950, color: '#fff', marginBottom: 12 }}>
            NOX CONNAÎT MIEUX TON NIVEAU.
          </div>
          <div style={{ fontSize: 14, color: '#777', lineHeight: 1.65, marginBottom: 26 }}>
            Tes charges de départ ont été ajustées à partir de ce que tu viens réellement de faire. La personnalisation continue ensuite avec tes séances, tes performances et ta récupération.
          </div>

          <div style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 16, padding: 18, marginBottom: 18 }}>
            <div style={{ fontSize: 11, color: '#555', fontWeight: 900, letterSpacing: '.08em', marginBottom: 12 }}>CE QUE NOX A APPRIS</div>
            {Object.entries(calibrations).map(([name, cal], index, arr) => (
              <div key={name} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '10px 0', borderBottom: index < arr.length - 1 ? '1px solid ' + BORDER : 'none' }}>
                <div style={{ fontSize: 13, color: '#aaa', flex: 1 }}>{name}</div>
                <div style={{ fontSize: 13, color: ACCENT, fontWeight: 800, whiteSpace: 'nowrap' }}>{cal.weight} kg · effort {cal.rpe}/6</div>
              </div>
            ))}
          </div>

          <div style={{ background: ACCENT + '0d', border: '1px solid ' + ACCENT + '33', borderRadius: 16, padding: 17, marginBottom: 24 }}>
            <div style={{ color: ACCENT, fontSize: 11, fontWeight: 900, marginBottom: 7 }}>LA CALIBRATION CONTINUE</div>
            <div style={{ color: '#aaa', fontSize: 13, lineHeight: 1.55 }}>
              Les premières séances restent importantes. NOX affinera progressivement ses recommandations à partir de tes charges, répétitions, difficulté réelle et check-ins de récupération.
            </div>
          </div>

          <button
            onClick={() => navigate('/program')}
            style={{ width: '100%', padding: 18, background: ACCENT, border: 'none', borderRadius: 14, color: '#000', fontWeight: 900, fontSize: 15, cursor: 'pointer' }}
          >
            VOIR MON PROGRAMME →
          </button>
        </div>
        <BottomNav active="settings" />
      </div>
    );
  }

  if (error && !currentExercise) {
    return (
      <div style={{ minHeight: '100vh', background: BG, padding: '34px 20px 100px' }}>
        <div style={{ maxWidth: 500, margin: '0 auto' }}>
          <button onClick={() => navigate('/home')} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 14, marginBottom: 24 }}>← Retour</button>
          <div style={{ fontSize: 24, color: '#fff', fontWeight: 900, marginBottom: 10 }}>CALIBRATION INDISPONIBLE</div>
          <div style={{ color: '#888', fontSize: 13, lineHeight: 1.6, marginBottom: 20 }}>{error}</div>
          <button onClick={() => navigate('/generate-program')} style={{ width: '100%', padding: 16, background: ACCENT, border: 0, borderRadius: 14, fontWeight: 900, cursor: 'pointer' }}>
            CRÉER MON PROGRAMME
          </button>
        </div>
        <BottomNav active="settings" />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: BG, paddingBottom: 95 }}>
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid ' + BORDER }}>
        <button onClick={() => navigate('/home')} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 14, padding: 0, marginBottom: 17 }}>
          ← Retour
        </button>

        <div style={{ fontSize: 11, color: ACCENT, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '.11em', marginBottom: 5 }}>
          Semaine 1 · Apprentissage NOX
        </div>
        <div style={{ fontSize: 23, fontWeight: 950, color: '#fff', lineHeight: 1.1 }}>
          CALIBRONS TON POINT DE DÉPART
        </div>
        <div style={{ fontSize: 12, color: '#666', lineHeight: 1.55, marginTop: 8 }}>
          NOX ne cherche pas ton maximum. Il apprend quelles charges sont adaptées à ton niveau réel pour construire une progression plus précise.
        </div>
      </div>

      <div style={{ padding: '20px 20px 0', maxWidth: 600, margin: '0 auto' }}>
        {error && (
          <div style={{ background: '#ff444411', border: '1px solid #ff444433', borderRadius: 13, padding: 13, marginBottom: 16, color: '#ff7777', fontSize: 12, lineHeight: 1.5 }}>
            {error}
          </div>
        )}

        <div style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 16, padding: 17, marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', marginBottom: 10 }}>
            <div>
              <div style={{ color: '#555', fontSize: 10, fontWeight: 900, letterSpacing: '.08em' }}>CALIBRATION INITIALE</div>
              <div style={{ color: '#fff', fontSize: 15, fontWeight: 900, marginTop: 3 }}>{Object.keys(calibrations).length} / {exercises.length} mouvements analysés</div>
            </div>
            <div style={{ color: ACCENT, fontSize: 22, fontWeight: 950 }}>{progress}%</div>
          </div>
          <div style={{ height: 5, background: '#1d1d1d', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ width: `${progress}%`, height: '100%', background: ACCENT, borderRadius: 99, transition: 'width .3s ease' }} />
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={{ color: '#555', fontSize: 10, fontWeight: 900, letterSpacing: '.08em', marginBottom: 10 }}>CE QUE NOX APPREND</div>
          <div style={{ display: 'grid', gap: 8 }}>
            {learningItems.map(item => (
              <div key={item.title} style={{ background: item.done ? ACCENT + '08' : SURFACE, border: '1px solid ' + (item.done ? ACCENT + '2f' : BORDER), borderRadius: 13, padding: '12px 14px', display: 'flex', gap: 11 }}>
                <div style={{ width: 22, height: 22, borderRadius: 7, background: item.done ? ACCENT : '#1b1b1b', color: item.done ? '#000' : '#555', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, flexShrink: 0 }}>
                  {item.done ? '✓' : '·'}
                </div>
                <div>
                  <div style={{ color: '#ddd', fontSize: 12, fontWeight: 850, marginBottom: 3 }}>{item.title}</div>
                  <div style={{ color: '#555', fontSize: 11, lineHeight: 1.45 }}>{item.text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ color: '#555', fontSize: 10, fontWeight: 900, letterSpacing: '.08em', marginBottom: 7 }}>
          MOUVEMENT {step + 1} / {exercises.length}
        </div>
        <div style={{ fontSize: 26, fontWeight: 950, color: '#fff', marginBottom: 5 }}>{currentExercise?.name}</div>
        {currentExercise?.muscles && (
          <div style={{ fontSize: 12, color: '#666', marginBottom: 18 }}>Cible · {currentExercise.muscles}</div>
        )}

        <div style={{ background: ACCENT + '0c', border: '1px solid ' + ACCENT + '2d', borderRadius: 14, padding: 16, marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 900, color: ACCENT, marginBottom: 8 }}>COMMENT FAIRE</div>
          <div style={{ fontSize: 13, color: '#bbb', lineHeight: 1.65 }}>
            1. Choisis une charge confortable que tu maîtrises.<br />
            2. Fais {currentExercise?.reps || '8-10'} répétitions avec une technique propre.<br />
            3. Arrête-toi si la technique se dégrade ou si tu ressens une douleur inhabituelle.<br />
            4. Indique ensuite la charge et ton effort réel.
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 11, color: '#666', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 8, fontWeight: 800 }}>
            Charge réellement utilisée
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              value={weight}
              onChange={e => setWeight(e.target.value.replace(/[^0-9.,]/g, ''))}
              placeholder="60"
              inputMode="decimal"
              style={{ width: '100%', padding: '17px 58px 17px 16px', background: SURFACE, border: '1px solid ' + (weight ? ACCENT + '66' : BORDER), borderRadius: 14, color: '#fff', fontSize: 28, fontWeight: 950, textAlign: 'center', boxSizing: 'border-box', outline: 'none' }}
            />
            <div style={{ position: 'absolute', right: 18, top: '50%', transform: 'translateY(-50%)', color: '#555', fontSize: 13, fontWeight: 800 }}>KG</div>
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 11, color: '#666', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 9, fontWeight: 800 }}>
            À quel point c'était difficile ?
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 7 }}>
            {[1, 2, 3, 4, 5, 6].map(value => (
              <button
                key={value}
                onClick={() => setRpe(value)}
                style={{ padding: '13px 0', background: rpe === value ? ACCENT : SURFACE, border: '1px solid ' + (rpe === value ? ACCENT : BORDER), borderRadius: 10, color: rpe === value ? '#000' : '#777', fontWeight: 900, fontSize: 17, cursor: 'pointer', touchAction: 'manipulation' }}
              >
                {value}
              </button>
            ))}
          </div>
          <div style={{ minHeight: 17, marginTop: 7, textAlign: 'center', color: rpe ? ACCENT : '#444', fontSize: 11, fontWeight: 800 }}>
            {rpe ? `${RPE_LABELS[rpe]} · ${rpe}/6` : '1 = très facile · 6 = limite'}
          </div>
        </div>

        <button
          onClick={saveCalibration}
          disabled={!weight || !rpe || saving}
          style={{ width: '100%', padding: 18, background: weight && rpe && !saving ? ACCENT : '#1a1a1a', border: 'none', borderRadius: 14, color: weight && rpe && !saving ? '#000' : '#444', fontWeight: 900, fontSize: 15, cursor: weight && rpe && !saving ? 'pointer' : 'not-allowed', touchAction: 'manipulation' }}
        >
          {saving ? 'ENREGISTREMENT...' : step < exercises.length - 1 ? 'VALIDER & CONTINUER →' : 'TERMINER LA CALIBRATION ✓'}
        </button>

        <div style={{ fontSize: 10, color: '#3f3f3f', lineHeight: 1.5, textAlign: 'center', marginTop: 12 }}>
          Cette étape sert à définir un point de départ, pas à tester ton maximum.
        </div>
      </div>

      <BottomNav active="settings" />
    </div>
  );
}
