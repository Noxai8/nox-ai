import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { BottomNav } from './Home';

const ACCENT = '#c8ff00';
const BG = '#0a0a0a';
const SURFACE = '#111';
const BORDER = '#1a1a1a';

const DAY_MS = 24 * 60 * 60 * 1000;

const num = (value: any) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const average = (values: number[]) =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;

const extractMetric = (row: any, keys: string[]) => {
  for (const key of keys) {
    const value = Number(row?.[key]);
    if (Number.isFinite(value)) return value;
  }
  return null;
};

export default function WeeklyReview() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState<any>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) loadWeekData();
  }, [user]);

  const callAI = async (prompt: string) => {
    const response = await fetch('https://zpxrsmnpcyzafawlweyl.supabase.co/functions/v1/generate-program', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpweHJzbW5wY3l6YWZhd2x3ZXlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzNTI1MDAsImV4cCI6MjEwNDkyODUwMH0.h76-uAn6f4qwtxIOTUt3sSzMdOSg7BzMIRFkXZW6iq4',
      },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) throw new Error(`Analyse NOX indisponible (${response.status}).`);

    const payload = await response.json();
    if (payload?.error) throw new Error(typeof payload.error === 'string' ? payload.error : 'Erreur du service NOX.');

    return payload?.data?.content?.[0]?.text || payload?.content?.[0]?.text || payload?.text || '';
  };

  const parseAIJson = (text: string) => {
    const cleaned = String(text || '').replace(/```json/gi, '').replace(/```/g, '').trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("NOX n'a pas renvoyé un bilan exploitable.");
    return JSON.parse(match[0]);
  };

  const loadWeekData = async () => {
    if (!user) return;

    setLoading(true);
    setError('');
    setAnalysis(null);

    try {
      const now = new Date();
      const weekStart = new Date(now.getTime() - 7 * DAY_MS).toISOString();
      const previousWeekStart = new Date(now.getTime() - 14 * DAY_MS).toISOString();

      const [
        profileRes,
        workoutsRes,
        previousWorkoutsRes,
        prsRes,
        bodyRes,
        fuelRes,
        targetsRes,
        programRes,
        moodRes,
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
        supabase.from('workouts').select('*').eq('user_id', user.id).eq('status', 'completed').gte('created_at', weekStart),
        supabase.from('workouts').select('*').eq('user_id', user.id).eq('status', 'completed').gte('created_at', previousWeekStart).lt('created_at', weekStart),
        supabase.from('personal_records').select('*').eq('user_id', user.id).gte('created_at', weekStart),
        supabase.from('body_logs').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(8),
        supabase.from('food_entries').select('calories, protein, carbs, fat, created_at').eq('user_id', user.id).gte('created_at', weekStart),
        supabase.from('nutrition_targets').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('workout_programs').select('*').eq('user_id', user.id).eq('is_active', true).maybeSingle(),
        supabase.from('mood_logs').select('*').eq('user_id', user.id).gte('created_at', weekStart),
      ]);

      const firstError = [
        profileRes.error,
        workoutsRes.error,
        previousWorkoutsRes.error,
        prsRes.error,
        bodyRes.error,
        fuelRes.error,
        targetsRes.error,
        programRes.error,
        moodRes.error,
      ].find(Boolean);

      if (firstError) throw firstError;

      const profile = profileRes.data;
      const workouts = workoutsRes.data || [];
      const previousWorkouts = previousWorkoutsRes.data || [];
      const prs = prsRes.data || [];
      const bodyLogs = bodyRes.data || [];
      const fuel = fuelRes.data || [];
      const target = targetsRes.data;
      const program = programRes.data;
      const moodLogs = moodRes.data || [];

      const sessions = program?.program_json?.sessions || [];
      const availableDays = Array.isArray(profile?.available_days) ? profile.available_days.length : 0;
      const workoutsPlanned = sessions.length || availableDays || 4;

      const latestWeight = bodyLogs.find((log: any) => Number.isFinite(Number(log?.weight)))?.weight;
      const oldestWeight = [...bodyLogs].reverse().find((log: any) => Number.isFinite(Number(log?.weight)))?.weight;
      const weightDelta =
        latestWeight != null && oldestWeight != null && bodyLogs.length >= 2
          ? Number((Number(latestWeight) - Number(oldestWeight)).toFixed(1))
          : null;

      const nutritionByDay = new Map<string, { calories: number; protein: number; carbs: number; fat: number }>();
      fuel.forEach((entry: any) => {
        const day = String(entry.created_at || '').slice(0, 10);
        if (!day) return;
        const current = nutritionByDay.get(day) || { calories: 0, protein: 0, carbs: 0, fat: 0 };
        current.calories += num(entry.calories);
        current.protein += num(entry.protein);
        current.carbs += num(entry.carbs);
        current.fat += num(entry.fat);
        nutritionByDay.set(day, current);
      });

      const nutritionDays = [...nutritionByDay.values()];
      const avgKcal = average(nutritionDays.map(day => day.calories));
      const avgProtein = average(nutritionDays.map(day => day.protein));
      const avgCarbs = average(nutritionDays.map(day => day.carbs));
      const avgFat = average(nutritionDays.map(day => day.fat));

      // nutrition_targets est l'unique source de vérité nutritionnelle NOX.
      const calorieTarget = extractMetric(target, ['calories']);
      const proteinTarget = extractMetric(target, ['protein']);
      const carbsTarget = extractMetric(target, ['carbs']);
      const fatTarget = extractMetric(target, ['fat']);

      const calorieAdherence =
        calorieTarget && nutritionDays.length
          ? Math.round(
              nutritionDays.reduce((sum, day) => {
                const distance = Math.abs(day.calories - calorieTarget) / calorieTarget;
                return sum + Math.max(0, 1 - distance);
              }, 0) / nutritionDays.length * 100
            )
          : null;

      const proteinAdherence =
        proteinTarget && nutritionDays.length
          ? Math.round(
              nutritionDays.reduce((sum, day) => sum + Math.min(day.protein / proteinTarget, 1), 0) /
              nutritionDays.length *
              100
            )
          : null;

      const moodScores = moodLogs.map((log: any) => num(log.mood_score)).filter(Boolean);
      const avgMood = average(moodScores);

      const recoveryScores = moodLogs
        .flatMap((log: any) => Array.isArray(log.symptoms) ? log.symptoms : [])
        .map((item: any) => {
          const match = String(item).match(/Recovery score:\s*(\d+)/i);
          return match ? Number(match[1]) : null;
        })
        .filter((value: any) => Number.isFinite(value)) as number[];

      const avgRecovery = average(recoveryScores);

      const totalDuration = workouts.reduce((sum: number, workout: any) => sum + num(workout.duration_minutes), 0);
      const previousDuration = previousWorkouts.reduce((sum: number, workout: any) => sum + num(workout.duration_minutes), 0);

      const weekData = {
        profile,
        program,
        workouts_done: workouts.length,
        workouts_planned: workoutsPlanned,
        adherence: Math.min(100, Math.round((workouts.length / Math.max(workoutsPlanned, 1)) * 100)),
        training_minutes: Math.round(totalDuration),
        previous_workouts_done: previousWorkouts.length,
        previous_training_minutes: Math.round(previousDuration),
        prs: prs.length,
        pr_details: prs.slice(0, 5).map((p: any) => `${p.exercise_name || 'Exercice'} ${p.weight || '?'}kg × ${p.reps || '?'}`),
        weight_delta: weightDelta,
        current_weight: latestWeight != null ? Number(latestWeight) : null,
        nutrition_days: nutritionDays.length,
        avg_kcal: avgKcal != null ? Math.round(avgKcal) : null,
        avg_protein: avgProtein != null ? Math.round(avgProtein) : null,
        avg_carbs: avgCarbs != null ? Math.round(avgCarbs) : null,
        avg_fat: avgFat != null ? Math.round(avgFat) : null,
        calorie_target: calorieTarget,
        protein_target: proteinTarget,
        carbs_target: carbsTarget,
        fat_target: fatTarget,
        nutrition_target_source: target ? 'nutrition_targets' : null,
        calorie_adherence: calorieAdherence,
        protein_adherence: proteinAdherence,
        recovery_checkins: moodLogs.length,
        avg_mood: avgMood != null ? Number(avgMood.toFixed(1)) : null,
        avg_recovery: avgRecovery != null ? Math.round(avgRecovery) : null,
        streak: profile?.streak_days || 0,
        xp: profile?.xp || 0,
        goal: profile?.goal_type || profile?.goal || profile?.objective || 'transformation',
      };

      setData(weekData);
      setLoading(false);
      await generateAnalysis(weekData);
    } catch (e: any) {
      console.error('WeeklyReview load error:', e);
      setError(e?.message || 'Impossible de charger ton bilan hebdomadaire.');
      setLoading(false);
    }
  };

  const generateAnalysis = async (weekData: any) => {
    setGenerating(true);

    try {
      const programSessions = weekData.program?.program_json?.sessions || [];

      const prompt = `Tu es NOX, coach fitness et nutrition. Fais un bilan hebdomadaire précis uniquement à partir des données ci-dessous.

OBJECTIF :
${weekData.goal}

ENTRAÎNEMENT :
- Séances réalisées : ${weekData.workouts_done}/${weekData.workouts_planned}
- Adhérence : ${weekData.adherence}%
- Temps d'entraînement : ${weekData.training_minutes} min
- Semaine précédente : ${weekData.previous_workouts_done} séances, ${weekData.previous_training_minutes} min
- Records personnels : ${weekData.prs}
- Détails PR : ${weekData.pr_details?.join(', ') || 'aucun'}

CORPS :
- Poids actuel : ${weekData.current_weight != null ? weekData.current_weight + ' kg' : 'non renseigné'}
- Évolution observée : ${weekData.weight_delta != null ? `${weekData.weight_delta > 0 ? '+' : ''}${weekData.weight_delta} kg` : 'données insuffisantes'}

NUTRITION :
- Jours renseignés : ${weekData.nutrition_days}/7
- Moyenne calories sur jours renseignés : ${weekData.avg_kcal != null ? weekData.avg_kcal + ' kcal' : 'données insuffisantes'}
- Cible calories : ${weekData.calorie_target != null ? weekData.calorie_target + ' kcal' : 'non disponible'}
- Adhérence calories estimée : ${weekData.calorie_adherence != null ? weekData.calorie_adherence + '%' : 'non calculable'}
- Moyenne protéines : ${weekData.avg_protein != null ? weekData.avg_protein + ' g' : 'données insuffisantes'}
- Cible protéines : ${weekData.protein_target != null ? weekData.protein_target + ' g' : 'non disponible'}
- Adhérence protéines : ${weekData.protein_adherence != null ? weekData.protein_adherence + '%' : 'non calculable'}
- Cible glucides : ${weekData.carbs_target != null ? weekData.carbs_target + ' g' : 'non disponible'}
- Cible lipides : ${weekData.fat_target != null ? weekData.fat_target + ' g' : 'non disponible'}
- Source des cibles : ${weekData.nutrition_target_source || 'aucune cible centrale disponible'}

RÉCUPÉRATION :
- Check-ins : ${weekData.recovery_checkins}/7
- Humeur moyenne : ${weekData.avg_mood != null ? weekData.avg_mood + '/5' : 'données insuffisantes'}
- Readiness moyen : ${weekData.avg_recovery != null ? weekData.avg_recovery + '/100' : 'non disponible'}

PROGRAMME ACTUEL :
${JSON.stringify(programSessions.map((session: any) => ({
  name: session.name,
  day: session.day,
  exercises: session.exercises?.map((exercise: any) => ({
    name: exercise.name,
    sets: exercise.sets,
    reps: exercise.reps,
    rest: exercise.rest,
    weight_suggestion: exercise.weight_suggestion,
  })),
})))}

RÈGLES :
- N'invente aucune donnée manquante.
- nutrition_targets est l'unique source de vérité pour les cibles calories/macros. Ne recalcule pas et ne remplace pas ces cibles.
- Si nutrition_targets est absent, indique que la cible nutritionnelle centrale est indisponible au lieu d'utiliser une ancienne valeur du profil.
- Les moyennes nutritionnelles portent uniquement sur les jours réellement renseignés. Un jour non tracké ne vaut jamais zéro calorie et ne doit pas être interprété comme une journée sans manger.
- Si peu de jours sont renseignés, baisse la confiance de toute conclusion nutritionnelle et demande davantage de suivi.
- L'adhérence calorique affichée mesure la proximité des jours trackés avec la cible, pas l'adhérence alimentaire réelle de toute la semaine.
- Ne promets jamais une date d'atteinte de l'objectif.
- Une seule semaine ne suffit pas pour conclure à une stagnation.
- Ne modifie pas automatiquement le programme à partir d'un simple manque d'adhérence.
- Tu peux recommander une adaptation seulement si les données disponibles la justifient clairement.
- Si les données sont insuffisantes, dis exactement quoi mieux renseigner la semaine prochaine.
- Ton direct, utile et encourageant, sans exagération.
- Réponds uniquement en JSON valide, sans markdown.

FORMAT :
{
  "note": 8,
  "titre": "SEMAINE SOLIDE",
  "decision": "PROGRAMME MAINTENU",
  "raison_decision": "Raison factuelle courte",
  "programme_modifie": false,
  "adaptations_programme": null,
  "sessions_mises_a_jour": null,
  "points_forts": ["Point concret"],
  "points_ameliorer": ["Action concrète"],
  "priorites_semaine_prochaine": ["Priorité 1", "Priorité 2", "Priorité 3"],
  "lecture_trajectoire": "Lecture prudente de la tendance sans prédiction garantie",
  "conseil": "Conseil opérationnel",
  "message": "Message NOX en 2 phrases maximum"
}`;

      const text = await callAI(prompt);
      const parsed = parseAIJson(text);

      parsed.note = Math.max(0, Math.min(10, Number(parsed.note) || 0));
      setAnalysis(parsed);

      // Une adaptation n'est appliquée que si l'IA renvoie explicitement un programme complet.
      if (
        parsed.programme_modifie === true &&
        Array.isArray(parsed.sessions_mises_a_jour) &&
        parsed.sessions_mises_a_jour.length > 0 &&
        weekData.program?.id
      ) {
        const updatedProgramJson = {
          ...weekData.program.program_json,
          sessions: parsed.sessions_mises_a_jour,
          last_adapted: new Date().toISOString(),
          last_adaptation_reason: parsed.adaptations_programme || parsed.raison_decision || 'Weekly Review NOX',
        };

        const { error: updateError } = await supabase
          .from('workout_programs')
          .update({
            program_json: updatedProgramJson,
            updated_at: new Date().toISOString(),
          })
          .eq('id', weekData.program.id)
          .eq('user_id', user!.id);

        if (updateError) throw updateError;
      }
    } catch (e: any) {
      console.error('WeeklyReview analysis error:', e);
      setError(e?.message || "NOX n'a pas pu générer l'analyse détaillée.");
    } finally {
      setGenerating(false);
    }
  };

  const noteColor = analysis?.note >= 7 ? ACCENT : analysis?.note >= 5 ? '#ffaa00' : '#ff5555';

  const nutritionStatus = useMemo(() => {
    if (!data) return '—';
    if (!data.nutrition_days) return '0/7';
    return `${data.nutrition_days}/7`;
  }, [data]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: ACCENT, fontWeight: 900, letterSpacing: '.12em' }}>NOX ANALYSE TA SEMAINE...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: BG, paddingBottom: 90 }}>
      <div style={{ padding: '22px 20px 16px', borderBottom: '1px solid ' + BORDER }}>
        <button onClick={() => navigate('/home')} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 14, marginBottom: 14, padding: 0 }}>
          ← Retour
        </button>
        <div style={{ fontSize: 11, color: ACCENT, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '.11em' }}>Weekly Review</div>
        <div style={{ fontSize: 24, fontWeight: 950, color: '#fff', marginTop: 4 }}>TA SEMAINE NOX</div>
        <div style={{ color: '#666', fontSize: 12, lineHeight: 1.5, marginTop: 6 }}>
          Entraînement, corps, nutrition et récupération réunis dans un seul bilan.
        </div>
      </div>

      <div style={{ padding: '20px 20px 0', maxWidth: 620, margin: '0 auto' }}>
        {error && (
          <div style={{ background: '#ff444411', border: '1px solid #ff444433', borderRadius: 14, padding: 14, marginBottom: 16 }}>
            <div style={{ color: '#ff7777', fontSize: 11, fontWeight: 900, marginBottom: 4 }}>ANALYSE INCOMPLÈTE</div>
            <div style={{ color: '#aaa', fontSize: 12, lineHeight: 1.5 }}>{error}</div>
          </div>
        )}

        {analysis && (
          <div style={{ background: SURFACE, border: '1px solid ' + noteColor + '44', borderRadius: 20, padding: 22, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#555', fontSize: 10, fontWeight: 900, letterSpacing: '.09em', marginBottom: 5 }}>SCORE HEBDOMADAIRE</div>
                <div style={{ color: '#fff', fontSize: 21, fontWeight: 950 }}>{analysis.titre}</div>
              </div>
              <div style={{ color: noteColor, fontSize: 42, lineHeight: 1, fontWeight: 950 }}>
                {analysis.note}<span style={{ color: '#444', fontSize: 15 }}>/10</span>
              </div>
            </div>
            {analysis.message && (
              <div style={{ fontSize: 13, color: '#888', marginTop: 12, lineHeight: 1.6 }}>{analysis.message}</div>
            )}
          </div>
        )}

        {data && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 9, marginBottom: 18 }}>
              {[
                { label: 'Séances', value: `${data.workouts_done}/${data.workouts_planned}`, sub: `${data.adherence}% adhérence`, good: data.adherence >= 75 },
                { label: 'Temps actif', value: `${data.training_minutes} min`, sub: `${data.previous_training_minutes} min semaine préc.`, good: data.training_minutes > 0 },
                { label: 'Records', value: String(data.prs), sub: data.prs ? 'PR cette semaine' : 'Aucun nouveau PR', good: data.prs > 0 },
                { label: 'Poids', value: data.current_weight != null ? `${data.current_weight} kg` : '—', sub: data.weight_delta != null ? `${data.weight_delta > 0 ? '+' : ''}${data.weight_delta} kg observé` : 'Pas assez de mesures', good: true },
              ].map(card => (
                <div key={card.label} style={{ background: SURFACE, border: '1px solid ' + (card.good ? ACCENT + '2c' : BORDER), borderRadius: 14, padding: 15 }}>
                  <div style={{ color: '#555', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', marginBottom: 6 }}>{card.label}</div>
                  <div style={{ color: '#fff', fontSize: 21, fontWeight: 950 }}>{card.value}</div>
                  <div style={{ color: '#555', fontSize: 10, marginTop: 4 }}>{card.sub}</div>
                </div>
              ))}
            </div>

            <div style={{ color: '#555', fontSize: 10, fontWeight: 900, letterSpacing: '.09em', marginBottom: 9 }}>NUTRITION</div>
            <div style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 16, padding: 16, marginBottom: 18 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                <div>
                  <div style={{ color: '#555', fontSize: 9, textTransform: 'uppercase' }}>Suivi</div>
                  <div style={{ color: '#fff', fontSize: 18, fontWeight: 900, marginTop: 3 }}>{nutritionStatus}</div>
                </div>
                <div>
                  <div style={{ color: '#555', fontSize: 9, textTransform: 'uppercase' }}>Calories</div>
                  <div style={{ color: '#fff', fontSize: 18, fontWeight: 900, marginTop: 3 }}>{data.avg_kcal != null ? data.avg_kcal : '—'}</div>
                </div>
                <div>
                  <div style={{ color: '#555', fontSize: 9, textTransform: 'uppercase' }}>Protéines</div>
                  <div style={{ color: '#fff', fontSize: 18, fontWeight: 900, marginTop: 3 }}>{data.avg_protein != null ? `${data.avg_protein}g` : '—'}</div>
                </div>
              </div>

              <div style={{ color: '#555', fontSize: 10, marginTop: 12, lineHeight: 1.45 }}>
                {data.nutrition_target_source
                  ? 'Cibles synchronisées avec Fuel · moyennes calculées uniquement sur les jours renseignés.'
                  : 'Aucune cible nutritionnelle centrale disponible · ouvre Fuel pour initialiser ta cible NOX.'}
              </div>

              {(data.calorie_adherence != null || data.protein_adherence != null) && (
                <div style={{ borderTop: '1px solid ' + BORDER, marginTop: 14, paddingTop: 13, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  {data.calorie_adherence != null && <div style={{ color: '#777', fontSize: 11 }}>Proximité calories · <strong style={{ color: ACCENT }}>{data.calorie_adherence}%</strong></div>}
                  {data.protein_adherence != null && <div style={{ color: '#777', fontSize: 11 }}>Couverture protéines · <strong style={{ color: ACCENT }}>{data.protein_adherence}%</strong></div>}
                </div>
              )}
            </div>

            <div style={{ color: '#555', fontSize: 10, fontWeight: 900, letterSpacing: '.09em', marginBottom: 9 }}>RÉCUPÉRATION</div>
            <div style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 16, padding: 16, marginBottom: 18 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                <div>
                  <div style={{ color: '#555', fontSize: 9, textTransform: 'uppercase' }}>Check-ins</div>
                  <div style={{ color: '#fff', fontSize: 18, fontWeight: 900, marginTop: 3 }}>{data.recovery_checkins}/7</div>
                </div>
                <div>
                  <div style={{ color: '#555', fontSize: 9, textTransform: 'uppercase' }}>Humeur</div>
                  <div style={{ color: '#fff', fontSize: 18, fontWeight: 900, marginTop: 3 }}>{data.avg_mood != null ? `${data.avg_mood}/5` : '—'}</div>
                </div>
                <div>
                  <div style={{ color: '#555', fontSize: 9, textTransform: 'uppercase' }}>Readiness</div>
                  <div style={{ color: '#fff', fontSize: 18, fontWeight: 900, marginTop: 3 }}>{data.avg_recovery != null ? data.avg_recovery : '—'}</div>
                </div>
              </div>
            </div>

            {data.pr_details?.length > 0 && (
              <div style={{ background: ACCENT + '08', border: '1px solid ' + ACCENT + '22', borderRadius: 15, padding: 15, marginBottom: 16 }}>
                <div style={{ color: ACCENT, fontSize: 10, fontWeight: 900, letterSpacing: '.08em', marginBottom: 9 }}>PROGRESSION · RECORDS</div>
                {data.pr_details.map((record: string) => (
                  <div key={record} style={{ color: '#bbb', fontSize: 12, lineHeight: 1.55, marginTop: 4 }}>
                    <span style={{ color: ACCENT, marginRight: 7 }}>↑</span>{record}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {analysis?.decision && (
          <div style={{ background: analysis.decision.includes('ADAPTATION') ? '#ffaa000d' : ACCENT + '0a', border: '1px solid ' + (analysis.decision.includes('ADAPTATION') ? '#ffaa0038' : ACCENT + '33'), borderRadius: 16, padding: 17, marginBottom: 14 }}>
            <div style={{ color: '#555', fontSize: 10, fontWeight: 900, letterSpacing: '.08em', marginBottom: 6 }}>DÉCISION NOX</div>
            <div style={{ color: analysis.decision.includes('ADAPTATION') ? '#ffaa00' : ACCENT, fontSize: 18, fontWeight: 950 }}>
              {analysis.decision}
            </div>
            {analysis.raison_decision && <div style={{ color: '#888', fontSize: 12, lineHeight: 1.55, marginTop: 7 }}>{analysis.raison_decision}</div>}

            {analysis.programme_modifie && analysis.adaptations_programme && (
              <div style={{ background: '#ffaa0014', borderRadius: 11, padding: 12, marginTop: 11 }}>
                <div style={{ color: '#ffaa00', fontSize: 10, fontWeight: 900, marginBottom: 4 }}>PROGRAMME MIS À JOUR</div>
                <div style={{ color: '#c9963e', fontSize: 12, lineHeight: 1.5 }}>{analysis.adaptations_programme}</div>
              </div>
            )}
          </div>
        )}

        {analysis?.lecture_trajectoire && (
          <div style={{ background: '#4488ff0b', border: '1px solid #4488ff2c', borderRadius: 16, padding: 16, marginBottom: 14 }}>
            <div style={{ color: '#6699ff', fontSize: 10, fontWeight: 900, letterSpacing: '.08em', marginBottom: 7 }}>TRAJECTOIRE</div>
            <div style={{ color: '#aaa', fontSize: 13, lineHeight: 1.6 }}>{analysis.lecture_trajectoire}</div>
          </div>
        )}

        {analysis?.points_forts?.length > 0 && (
          <div style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 16, padding: 16, marginBottom: 12 }}>
            <div style={{ color: ACCENT, fontSize: 10, fontWeight: 900, letterSpacing: '.08em', marginBottom: 9 }}>CE QUI A MARCHÉ</div>
            {analysis.points_forts.map((point: string) => (
              <div key={point} style={{ display: 'flex', gap: 8, color: '#bbb', fontSize: 13, lineHeight: 1.5, marginTop: 6 }}>
                <span style={{ color: ACCENT }}>✓</span><span>{point}</span>
              </div>
            ))}
          </div>
        )}

        {analysis?.points_ameliorer?.length > 0 && (
          <div style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 16, padding: 16, marginBottom: 12 }}>
            <div style={{ color: '#ffaa00', fontSize: 10, fontWeight: 900, letterSpacing: '.08em', marginBottom: 9 }}>À AJUSTER</div>
            {analysis.points_ameliorer.map((point: string) => (
              <div key={point} style={{ display: 'flex', gap: 8, color: '#bbb', fontSize: 13, lineHeight: 1.5, marginTop: 6 }}>
                <span style={{ color: '#ffaa00' }}>→</span><span>{point}</span>
              </div>
            ))}
          </div>
        )}

        {analysis?.priorites_semaine_prochaine?.length > 0 && (
          <div style={{ background: ACCENT + '09', border: '1px solid ' + ACCENT + '2c', borderRadius: 16, padding: 17, marginBottom: 14 }}>
            <div style={{ color: ACCENT, fontSize: 10, fontWeight: 900, letterSpacing: '.08em', marginBottom: 10 }}>PLAN · SEMAINE PROCHAINE</div>
            {analysis.priorites_semaine_prochaine.slice(0, 3).map((priority: string, index: number) => (
              <div key={priority} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginTop: index ? 9 : 0 }}>
                <div style={{ width: 21, height: 21, borderRadius: 7, background: ACCENT, color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 950, flexShrink: 0 }}>{index + 1}</div>
                <div style={{ color: '#ccc', fontSize: 13, lineHeight: 1.5 }}>{priority}</div>
              </div>
            ))}
          </div>
        )}

        {analysis?.conseil && (
          <div style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 16, padding: 16, marginBottom: 20 }}>
            <div style={{ color: '#555', fontSize: 10, fontWeight: 900, letterSpacing: '.08em', marginBottom: 7 }}>CONSEIL NOX</div>
            <div style={{ color: '#bbb', fontSize: 13, lineHeight: 1.6 }}>{analysis.conseil}</div>
          </div>
        )}

        {generating && !analysis && (
          <div style={{ textAlign: 'center', padding: '30px 0', color: '#666', fontSize: 12 }}>
            NOX croise entraînement, nutrition et récupération...
          </div>
        )}

        {!generating && !analysis && data && (
          <button
            onClick={() => generateAnalysis(data)}
            style={{ width: '100%', padding: 16, background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 14, color: '#fff', fontWeight: 900, cursor: 'pointer', marginBottom: 12 }}
          >
            RELANCER L'ANALYSE NOX
          </button>
        )}

        <button
          onClick={() => navigate('/home')}
          style={{ width: '100%', padding: 17, background: ACCENT, border: 'none', borderRadius: 14, color: '#000', fontWeight: 900, fontSize: 14, cursor: 'pointer' }}
        >
          RETOUR À L'ACCUEIL
        </button>
      </div>

      <BottomNav active="home" />
    </div>
  );
}
