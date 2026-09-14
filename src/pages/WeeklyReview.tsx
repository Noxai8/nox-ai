import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { BottomNav } from './Home';

const ACCENT = '#c8ff00';
const BG = '#0a0a0a';
const SURFACE = '#111';
const BORDER = '#1a1a1a';

export default function WeeklyReview() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => { if (user) loadWeekData(); }, [user]);

  const loadWeekData = async () => {
    const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [{ data: profile }, { data: workouts }, { data: prs }, { data: bodyLogs }, { data: fuel }, { data: program }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user!.id).maybeSingle(),
      supabase.from('workouts').select('*').eq('user_id', user!.id).eq('status', 'completed').gte('created_at', weekStart),
      supabase.from('personal_records').select('*').eq('user_id', user!.id).gte('created_at', weekStart),
      supabase.from('body_logs').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(2),
      supabase.from('food_entries').select('calories, protein').eq('user_id', user!.id).gte('created_at', weekStart),
      supabase.from('workout_programs').select('*').eq('user_id', user!.id).eq('is_active', true).maybeSingle(),
    ]);

    const weightDelta = bodyLogs && bodyLogs.length >= 2
      ? parseFloat((bodyLogs[0].weight - bodyLogs[1].weight).toFixed(1))
      : null;
    const avgKcal = fuel && fuel.length > 0
      ? Math.round(fuel.reduce((s: number, f: any) => s + (f.calories || 0), 0) / 7)
      : 0;
    const avgProtein = fuel && fuel.length > 0
      ? Math.round(fuel.reduce((s: number, f: any) => s + (f.protein || 0), 0) / 7)
      : 0;

    const weekData = {
      profile,
      program,
      workouts_done: workouts?.length || 0,
      workouts_planned: profile?.available_days?.length || 4,
      prs: prs?.length || 0,
      pr_details: prs?.slice(0, 3).map((p: any) => `${p.exercise_name} ${p.weight}kg×${p.reps}`),
      weight_delta: weightDelta,
      current_weight: bodyLogs?.[0]?.weight,
      avg_kcal: avgKcal,
      avg_protein: avgProtein,
      streak: profile?.streak_days || 0,
      xp: profile?.xp || 0,
      goal: profile?.goal_type || 'transformation',
    };

    setData(weekData);
    setLoading(false);
    generateAnalysis(weekData);
  };

  const generateAnalysis = async (weekData: any) => {
    setGenerating(true);
    try {
      const programSessions = weekData.program?.program_json?.sessions || [];
      const prompt = `Tu es NOX. Analyse cette semaine et génère un bilan avec adaptation réelle du programme si nécessaire.

DONNÉES SEMAINE :
- Objectif : ${weekData.goal}
- Séances réalisées : ${weekData.workouts_done}/${weekData.workouts_planned}
- PR cette semaine : ${weekData.prs} (${weekData.pr_details?.join(', ') || 'aucun'})
- Poids : ${weekData.current_weight ? weekData.current_weight + 'kg' : '?'} (évolution : ${weekData.weight_delta !== null ? (weekData.weight_delta > 0 ? '+' : '') + weekData.weight_delta + 'kg' : 'inconnue'})
- Calories moy/jour : ${weekData.avg_kcal} kcal
- Protéines moy/jour : ${weekData.avg_protein}g
- Streak : ${weekData.streak} jours
- Programme actif : ${weekData.program?.name || 'aucun'}
- Nombre de séances programme : ${programSessions.length}

PROGRAMME ACTUEL (sessions) :
${JSON.stringify(programSessions.map((s: any) => ({ name: s.name, day: s.day, exercises: s.exercises?.map((e: any) => ({ name: e.name, sets: e.sets, reps: e.reps, rest: e.rest })) })), null, 2)}

Réponds UNIQUEMENT en JSON valide :
{
  "note": 8,
  "titre": "SEMAINE SOLIDE",
  "decision": "PROGRAMME MAINTENU",
  "raison_decision": "3 séances sur 4, performances en hausse — on garde le cap",
  "programme_modifie": false,
  "adaptations_programme": null,
  "sessions_mises_a_jour": null,
  "points_forts": ["Point fort concret basé sur les données"],
  "points_ameliorer": ["Point actionnable concret"],
  "contrefactuel": "À ce rythme, objectif dans X semaines. Si tu avais fait 4/4 : X jours d'avance.",
  "conseil": "Conseil très concret pour la semaine prochaine",
  "message": "Message direct comme un pote, 2 phrases max"
}

RÈGLES CRITIQUES :
- decision = "PROGRAMME MAINTENU" ou "ADAPTATION RECOMMANDÉE"
- Si moins de 75% adhérence OU stagnation OU surcharge → decision = "ADAPTATION RECOMMANDÉE"
- Si adaptation recommandée : programme_modifie = true ET sessions_mises_a_jour = tableau complet des sessions MODIFIÉES (même structure que le programme actuel, avec les exercices ajustés)
- Adaptations possibles : augmenter charges (+2.5kg compound si PR réguliers), réduire volume (si fatigue), changer exercice (si stagnation), ajouter/supprimer séance
- adaptations_programme = description lisible des changements faits (ex: "+2.5kg développé couché, volume squat réduit d'1 série")
- Si programme_modifie = true, sessions_mises_a_jour doit être le tableau complet des sessions avec les mêmes champs
- contrefactuel toujours basé sur les données réelles
- Ton direct, naturel, pas corporate`;

      const { data: fnData, error: fnErr } = await supabase.functions.invoke('generate-program', {
        body: { prompt },
      });

      if (fnErr) throw new Error(fnErr.message);
      const text = fnData?.content?.[0]?.text || '';
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('Format invalide');
      const parsed = JSON.parse(match[0]);
      setAnalysis(parsed);

      // APPLIQUER L'ADAPTATION AU PROGRAMME SI NÉCESSAIRE
      if (parsed.programme_modifie && parsed.sessions_mises_a_jour && weekData.program?.id) {
        const updatedProgramJson = {
          ...weekData.program.program_json,
          sessions: parsed.sessions_mises_a_jour,
          last_adapted: new Date().toISOString(),
          last_adaptation_reason: parsed.adaptations_programme,
        };
        await supabase.from('workout_programs').update({
          program_json: updatedProgramJson,
          updated_at: new Date().toISOString(),
        }).eq('id', weekData.program.id);
      }
    } catch (err) {
      console.error('WeeklyReview error:', err);
      setAnalysis(null);
    }
    setGenerating(false);
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: ACCENT, fontWeight: 900 }}>ANALYSE...</div>
    </div>
  );

  const adherence = data ? Math.round((data.workouts_done / Math.max(data.workouts_planned, 1)) * 100) : 0;
  const noteColor = analysis?.note >= 7 ? ACCENT : analysis?.note >= 5 ? '#ffaa00' : '#ff4444';

  return (
    <div style={{ minHeight: '100vh', background: BG, paddingBottom: 80 }}>
      <div style={{ padding: '24px 20px 16px', borderBottom: '1px solid ' + BORDER }}>
        <button onClick={() => navigate('/home')} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 14, marginBottom: 12 }}>← Retour</button>
        <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.1em' }}>Bilan</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: '#fff' }}>TA SEMAINE NOX</div>
      </div>

      <div style={{ padding: '20px 20px 0' }}>

        {/* Score + titre */}
        {analysis && (
          <div style={{ background: SURFACE, border: '1px solid ' + noteColor + '44', borderRadius: 20, padding: 24, marginBottom: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 72, fontWeight: 900, color: noteColor, lineHeight: 1 }}>
              {analysis.note}<span style={{ fontSize: 24, color: '#333' }}>/10</span>
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', marginTop: 8 }}>{analysis.titre}</div>
            {analysis.message && (
              <div style={{ fontSize: 14, color: '#888', marginTop: 12, lineHeight: 1.6, fontStyle: 'italic' }}>"{analysis.message}"</div>
            )}
          </div>
        )}

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 16 }}>
          {[
            { label: 'Séances', value: `${data.workouts_done}/${data.workouts_planned}`, icon: '🏋️', ok: data.workouts_done >= data.workouts_planned },
            { label: 'Adhérence', value: adherence + '%', icon: '📊', ok: adherence >= 75 },
            { label: 'Records', value: data.prs, icon: '🏆', ok: data.prs > 0 },
            { label: 'Poids', value: data.weight_delta !== null ? (data.weight_delta > 0 ? '+' : '') + data.weight_delta + ' kg' : '—', icon: '⚖️', ok: true },
          ].map(({ label, value, icon, ok }) => (
            <div key={label} style={{ background: SURFACE, border: '1px solid ' + (ok ? ACCENT + '33' : BORDER), borderRadius: 14, padding: '16px 14px' }}>
              <div style={{ fontSize: 20, marginBottom: 6 }}>{icon}</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#fff' }}>{value}</div>
              <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* DÉCISION NOX */}
        {analysis?.decision && (
          <div style={{ background: analysis.decision.includes('ADAPTATION') ? '#ffaa0011' : ACCENT + '11', border: '1px solid ' + (analysis.decision.includes('ADAPTATION') ? '#ffaa0044' : ACCENT + '44'), borderRadius: 16, padding: 20, marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>DÉCISION NOX</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: analysis.decision.includes('ADAPTATION') ? '#ffaa00' : ACCENT }}>
              {analysis.decision}
            </div>
            {analysis.raison_decision && (
              <div style={{ fontSize: 13, color: '#888', marginTop: 8, lineHeight: 1.5 }}>{analysis.raison_decision}</div>
            )}
            {analysis.programme_modifie && analysis.adaptations_programme && (
              <div style={{ marginTop: 12, background: '#ffaa0022', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: 11, color: '#ffaa00', fontWeight: 800, marginBottom: 4 }}>✓ PROGRAMME MIS À JOUR</div>
                <div style={{ fontSize: 13, color: '#ffaa00' }}>{analysis.adaptations_programme}</div>
              </div>
            )}
          </div>
        )}

        {/* CONTRE-FACTUEL */}
        {analysis?.contrefactuel && (
          <div style={{ background: '#4488ff11', border: '1px solid #4488ff33', borderRadius: 16, padding: 16, marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: '#4488ff', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>📈 TRAJECTOIRE</div>
            <div style={{ fontSize: 14, color: '#ccc', lineHeight: 1.6 }}>{analysis.contrefactuel}</div>
          </div>
        )}

        {/* Points forts */}
        {analysis?.points_forts?.length > 0 && (
          <div style={{ background: ACCENT + '0a', border: '1px solid ' + ACCENT + '22', borderRadius: 16, padding: 16, marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: ACCENT, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }}>✅ POINTS FORTS</div>
            {analysis.points_forts.map((p: string) => (
              <div key={p} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                <span style={{ color: ACCENT }}>•</span>
                <span style={{ fontSize: 14, color: '#ccc' }}>{p}</span>
              </div>
            ))}
          </div>
        )}

        {/* À améliorer */}
        {analysis?.points_ameliorer?.length > 0 && (
          <div style={{ background: '#ff660008', border: '1px solid #ff660022', borderRadius: 16, padding: 16, marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: '#ff6600', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }}>⚡ À TRAVAILLER</div>
            {analysis.points_ameliorer.map((p: string) => (
              <div key={p} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                <span style={{ color: '#ff6600' }}>•</span>
                <span style={{ fontSize: 14, color: '#ccc' }}>{p}</span>
              </div>
            ))}
          </div>
        )}

        {/* Conseil */}
        {analysis?.conseil && (
          <div style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 16, padding: 16, marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: '#555', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>SEMAINE PROCHAINE</div>
            <div style={{ fontSize: 14, color: '#ccc', lineHeight: 1.6 }}>{analysis.conseil}</div>
          </div>
        )}

        {generating && !analysis && (
          <div style={{ textAlign: 'center', padding: '32px 0', color: '#555' }}>
            <div style={{ fontSize: 13 }}>NOX analyse ta semaine...</div>
          </div>
        )}

        <button onClick={() => navigate('/home')}
          style={{ width: '100%', padding: 16, background: ACCENT, border: 'none', borderRadius: 14, color: '#000', fontWeight: 900, fontSize: 14, cursor: 'pointer' }}>
          RETOUR À L'ACCUEIL
        </button>
      </div>

      <BottomNav active="home" />
    </div>
  );
}
