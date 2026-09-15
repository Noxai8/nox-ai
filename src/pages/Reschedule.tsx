import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from './Home';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';

const ACCENT = '#c8ff00';
const BG = '#0a0a0a';
const SURFACE = '#111';
const BORDER = '#1a1a1a';

type Situation = 'missed_sessions' | 'short_time' | 'no_equipment' | 'fatigue' | 'travel';

export default function Reschedule() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [situation, setSituation] = useState<Situation | null>(null);
  const [timeAvailable, setTimeAvailable] = useState('');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [program, setProgram] = useState<any>(null);
  const [missedCount, setMissedCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    const { data: prog } = await supabase.from('workout_programs').select('*').eq('user_id', user!.id).eq('is_active', true).maybeSingle();
    setProgram(prog);

    // Détecter séances manquées cette semaine
    const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: workouts } = await supabase.from('workouts').select('id').eq('user_id', user!.id).eq('status', 'completed').gte('created_at', weekStart);
    const planned = prog?.program_json?.sessions?.length || 4;
    const done = workouts?.length || 0;
    setMissedCount(Math.max(0, planned - done));
  };

  const generate = async () => {
    if (!situation || !program) return;
    setGenerating(true);

    const sessions = program.program_json?.sessions || [];
    const remainingDays = 7 - new Date().getDay();

    const situationDesc = {
      missed_sessions: `J'ai raté ${missedCount} séance(s) cette semaine. Il me reste ${remainingDays} jours.`,
      short_time: `Je n'ai que ${timeAvailable} minutes disponibles aujourd'hui.`,
      no_equipment: `Je n'ai pas accès à la salle aujourd'hui (poids du corps uniquement).`,
      fatigue: `Je suis très fatigué mais je veux quand même faire quelque chose.`,
      travel: `Je suis en déplacement, équipement limité ou nul.`,
    }[situation];

    const prompt = `Tu es NOX. Recompose la semaine d'entraînement selon la situation réelle.

SITUATION : ${situationDesc}

PROGRAMME ACTUEL :
${JSON.stringify(sessions.map((s: any) => ({ name: s.name, day: s.day, duration: s.duration, exercises: s.exercises?.map((e: any) => ({ name: e.name, sets: e.sets, reps: e.reps, muscles: e.muscles })) })), null, 2)}

Réponds UNIQUEMENT en JSON :
{
  "titre": "Titre court de la solution",
  "message": "Explication naturelle comme un pote — ce que tu as fait et pourquoi",
  "volume_conserve": "ex: Volume hebdo conservé à 87%",
  "seance_aujourd_hui": {
    "name": "NOM SÉANCE ADAPTÉE",
    "duration": 30,
    "focus": "Description rapide",
    "exercises": [
      { "name": "Nom exercice", "sets": "3", "reps": "10-12", "rest": "60s", "muscles": "Muscles ciblés", "note": "Modification si besoin" }
    ]
  },
  "semaine_recomposee": [
    { "day": "MER", "name": "Séance X", "status": "maintenue/déplacée/supprimée" }
  ],
  "conseil": "Un conseil court et actionnable"
}

RÈGLES :
- Préserve les stimuli prioritaires (compound movements en premier)
- Si temps court : réduire séries, pas d'exercices d'isolation
- Si pas d'équipement : substitutions poids du corps uniquement
- Si fatigue : réduire volume de 30-40%, aucun PR attempt
- Si séances manquées : répartir le volume restant sur les jours disponibles
- Volume hebdo : indique toujours le pourcentage conservé`;

    try {
      const { data: fnData } = (await fetch('https://zpxrsmnpcyzafawlweyl.supabase.co/functions/v1/generate-program', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpweHJzbW5wY3l6YWZhd2x3ZXlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzNTI1MDAsImV4cCI6MjEwNDkyODUwMH0.h76-uAn6f4qwtxIOTUt3sSzMdOSg7BzMIRFkXZW6iq4' }, body: JSON.stringify({ prompt }) })).json();
      const text = fnData?.content?.[0]?.text || '';
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        setResult(parsed);

        // Si séance adaptée générée, la sauvegarder comme séance du jour dans le programme
        if (parsed.seance_aujourd_hui && program?.id) {
          const updatedJson = {
            ...program.program_json,
            emergency_session: {
              ...parsed.seance_aujourd_hui,
              created_at: new Date().toISOString(),
              reason: situation,
            },
          };
          await supabase.from('workout_programs').update({ program_json: updatedJson }).eq('id', program.id);
        }
      }
    } catch (err) {
      console.error(err);
    }
    setGenerating(false);
  };

  const situations = [
    { id: 'missed_sessions', icon: '📅', label: 'J\'ai raté des séances', desc: missedCount > 0 ? `${missedCount} séance(s) manquée(s) cette semaine` : 'Recomposer la semaine' },
    { id: 'short_time', icon: '⏱️', label: 'Je n\'ai pas le temps', desc: 'Séance condensée selon le temps dispo' },
    { id: 'no_equipment', icon: '🏠', label: 'Pas accès à la salle', desc: 'Adaptation poids du corps uniquement' },
    { id: 'fatigue', icon: '😴', label: 'Je suis épuisé', desc: 'Volume réduit, récupération active' },
    { id: 'travel', icon: '✈️', label: 'Je suis en déplacement', desc: 'Programme minimal sans matériel' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: BG, paddingBottom: 40 }}>
      <div style={{ padding: '24px 20px 16px', borderBottom: '1px solid ' + BORDER }}>
        <button onClick={() => navigate('/home')} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 14, marginBottom: 12 }}>← Retour</button>
        <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.1em' }}>Vie réelle</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: '#fff' }}>LES PLANS CHANGENT</div>
        <div style={{ fontSize: 13, color: '#555', marginTop: 4 }}>NOX recompose ta semaine selon ta situation.</div>
      </div>

      <div style={{ padding: '20px 20px 0' }}>
        {!result ? (
          <>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#555', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 12 }}>QU'EST-CE QUI SE PASSE ?</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {situations.map(s => (
                <button key={s.id} onClick={() => setSituation(s.id as Situation)}
                  style={{ background: SURFACE, border: '2px solid ' + (situation === s.id ? ACCENT : BORDER), borderRadius: 14, padding: '14px 16px', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 14 }}>
                  <span style={{ fontSize: 28, flexShrink: 0 }}>{s.icon}</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: situation === s.id ? ACCENT : '#fff' }}>{s.label}</div>
                    <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>{s.desc}</div>
                  </div>
                </button>
              ))}
            </div>

            {situation === 'short_time' && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, color: '#555', marginBottom: 8 }}>COMBIEN DE MINUTES ?</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['15', '25', '30', '45'].map(t => (
                    <button key={t} onClick={() => setTimeAvailable(t)}
                      style={{ flex: 1, padding: '12px 0', background: timeAvailable === t ? ACCENT : SURFACE, border: '1px solid ' + (timeAvailable === t ? ACCENT : BORDER), borderRadius: 10, color: timeAvailable === t ? '#000' : '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button onClick={generate}
              disabled={!situation || generating || (situation === 'short_time' && !timeAvailable)}
              style={{ width: '100%', padding: 18, background: situation ? ACCENT : '#1a1a1a', border: 'none', borderRadius: 14, color: situation ? '#000' : '#333', fontWeight: 900, fontSize: 15, cursor: situation ? 'pointer' : 'not-allowed' }}>
              {generating ? 'NOX RECOMPOSE...' : 'ADAPTER MON PLAN →'}
            </button>
          </>
        ) : (
          <>
            {/* Résultat */}
            <div style={{ background: ACCENT + '11', border: '1px solid ' + ACCENT + '33', borderRadius: 16, padding: 20, marginBottom: 16 }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', marginBottom: 8 }}>{result.titre}</div>
              <div style={{ fontSize: 13, color: '#888', lineHeight: 1.6, marginBottom: 8 }}>{result.message}</div>
              {result.volume_conserve && (
                <div style={{ fontSize: 12, color: ACCENT, fontWeight: 700 }}>✓ {result.volume_conserve}</div>
              )}
            </div>

            {/* Séance du jour */}
            {result.seance_aujourd_hui && (
              <div style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 16, padding: 20, marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 12 }}>SÉANCE AUJOURD'HUI · {result.seance_aujourd_hui.duration} min</div>
                <div style={{ fontSize: 17, fontWeight: 900, color: '#fff', marginBottom: 16 }}>{result.seance_aujourd_hui.name}</div>
                {result.seance_aujourd_hui.exercises?.map((ex: any, i: number) => (
                  <div key={i} style={{ borderTop: i === 0 ? 'none' : '1px solid #1a1a1a', padding: '10px 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{ex.name}</div>
                        <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>{ex.muscles}</div>
                        {ex.note && <div style={{ fontSize: 11, color: '#ffaa00', marginTop: 2 }}>{ex.note}</div>}
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: ACCENT }}>{ex.sets} × {ex.reps}</div>
                        <div style={{ fontSize: 11, color: '#555' }}>repos {ex.rest}</div>
                      </div>
                    </div>
                  </div>
                ))}
                <button onClick={() => navigate('/training/emergency')}
                  style={{ width: '100%', marginTop: 16, padding: 14, background: ACCENT, border: 'none', borderRadius: 12, color: '#000', fontWeight: 900, fontSize: 14, cursor: 'pointer' }}>
                  COMMENCER CETTE SÉANCE ▶
                </button>
              </div>
            )}

            {/* Semaine recomposée */}
            {result.semaine_recomposee && (
              <div style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 14, padding: 16, marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 12 }}>SEMAINE RECOMPOSÉE</div>
                {result.semaine_recomposee.map((s: any, i: number) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderTop: i === 0 ? 'none' : '1px solid #1a1a1a' }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <div style={{ width: 40, textAlign: 'center', fontSize: 11, fontWeight: 800, color: '#555' }}>{s.day}</div>
                      <div style={{ fontSize: 13, color: s.status === 'supprimée' ? '#555' : '#fff', textDecoration: s.status === 'supprimée' ? 'line-through' : 'none' }}>{s.name}</div>
                    </div>
                    <div style={{ fontSize: 11, color: s.status === 'maintenue' ? ACCENT : s.status === 'déplacée' ? '#ffaa00' : '#555', fontWeight: 700 }}>
                      {s.status}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {result.conseil && (
              <div style={{ background: '#1a1a1a', borderRadius: 12, padding: 14, marginBottom: 20, fontSize: 13, color: '#888', lineHeight: 1.5 }}>
                💡 {result.conseil}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setResult(null); setSituation(null); }}
                style={{ flex: 1, padding: 14, background: 'transparent', border: '1px solid ' + BORDER, borderRadius: 12, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                REFAIRE
              </button>
              <button onClick={() => navigate('/home')}
                style={{ flex: 2, padding: 14, background: ACCENT, border: 'none', borderRadius: 12, color: '#000', fontWeight: 900, cursor: 'pointer' }}>
                RETOUR HOME
              </button>
            </div>
          </>
        )}
      </div>
      <BottomNav active="home" />
    </div>
  );
}
