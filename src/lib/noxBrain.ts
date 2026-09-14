/**
 * NOX BRAIN — La couche d'intelligence qui relie les données aux décisions
 * TDEE réel, adaptation programme, NOX Score avec confiance
 */

// ─── TDEE RÉEL ──────────────────────────────────────────────────────────────
export interface TDEEResult {
  tdeeReal: number | null;
  tdeeFormula: number | null;
  delta: number | null;
  confidence: 'haute' | 'moyenne' | 'faible' | 'insuffisant';
  weeksOfData: number;
  insight: string | null;
}

export function calculateRealTDEE(
  bodyLogs: { weight: number; created_at: string }[],
  foodEntries: { calories: number; created_at: string }[],
  profile: { height_cm?: number; starting_weight_kg?: number; activity_level?: string; date_of_birth?: string }
): TDEEResult {
  if (bodyLogs.length < 2 || foodEntries.length < 7) {
    return { tdeeReal: null, tdeeFormula: null, delta: null, confidence: 'insuffisant', weeksOfData: 0, insight: null };
  }

  // Trier par date
  const sorted = [...bodyLogs].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const oldest = sorted[0];
  const newest = sorted[sorted.length - 1];

  const daysDiff = Math.max(1, (new Date(newest.created_at).getTime() - new Date(oldest.created_at).getTime()) / (1000 * 60 * 60 * 24));
  const weeksOfData = Math.round(daysDiff / 7);

  // Calories moyennes sur la période
  const periodStart = oldest.created_at;
  const periodFuel = foodEntries.filter(f => f.created_at >= periodStart);
  if (periodFuel.length < 5) {
    return { tdeeReal: null, tdeeFormula: null, delta: null, confidence: 'insuffisant', weeksOfData, insight: null };
  }

  const avgCalories = periodFuel.reduce((s, f) => s + (f.calories || 0), 0) / daysDiff;
  const weightChangKg = newest.weight - oldest.weight;
  // 1kg graisse ≈ 7700 kcal
  const caloriesFromWeightChange = (weightChangKg * 7700) / daysDiff;
  const tdeeReal = Math.round(avgCalories - caloriesFromWeightChange);

  // TDEE formule (Mifflin-St Jeor)
  let tdeeFormula: number | null = null;
  if (profile.height_cm && profile.starting_weight_kg) {
    const weight = newest.weight || profile.starting_weight_kg;
    const height = profile.height_cm;
    // Âge approximatif
    const age = profile.date_of_birth
      ? Math.floor((Date.now() - new Date(profile.date_of_birth).getTime()) / (1000 * 60 * 60 * 24 * 365))
      : 30;
    const bmr = 10 * weight + 6.25 * height - 5 * age + 5; // homme par défaut
    const activityMultipliers: Record<string, number> = {
      'sédentaire': 1.2, 'légèrement actif': 1.375, 'modérément actif': 1.55,
      'très actif': 1.725, 'extrêmement actif': 1.9,
    };
    const multiplier = activityMultipliers[profile.activity_level || ''] || 1.55;
    tdeeFormula = Math.round(bmr * multiplier);
  }

  const delta = tdeeFormula ? tdeeReal - tdeeFormula : null;
  const confidence: TDEEResult['confidence'] = weeksOfData >= 4 ? 'haute' : weeksOfData >= 2 ? 'moyenne' : 'faible';

  let insight: string | null = null;
  if (delta !== null && Math.abs(delta) > 150) {
    if (delta < 0) {
      insight = `Ton métabolisme réel (${tdeeReal} kcal) est ${Math.abs(delta)} kcal sous la formule standard. C'est pour ça que tu progresses moins vite. Objectif recalculé.`;
    } else {
      insight = `Ton métabolisme réel (${tdeeReal} kcal) est ${delta} kcal au-dessus de la formule. Tu brûles plus que prévu — bonne nouvelle.`;
    }
  }

  return { tdeeReal, tdeeFormula, delta, confidence, weeksOfData, insight };
}

// ─── NOX SCORE AVEC CONFIANCE ────────────────────────────────────────────────
export interface NoxScoreResult {
  score: number;
  confidence: 'élevée' | 'moyenne' | 'faible';
  confidenceReason: string;
  components: {
    training: number;
    body: number;
    fuel: number;
    consistency: number;
    performance: number;
  };
  weeksOfData: number;
}

export function calculateNoxScore(data: {
  workoutCount: number;
  weekWorkouts: number;
  weekPlanned: number;
  prCount: number;
  hasWeight: boolean;
  hasFuel: boolean;
  todayKcal: number;
  targetKcal: number;
  streak: number;
  xp: number;
  firstWorkoutDate?: string;
}): NoxScoreResult {
  const weeksOfData = data.firstWorkoutDate
    ? Math.max(1, Math.floor((Date.now() - new Date(data.firstWorkoutDate).getTime()) / (1000 * 60 * 60 * 24 * 7)))
    : 0;

  // Composantes
  const trainingScore = Math.min(100,
    (data.weekWorkouts / Math.max(data.weekPlanned, 1)) * 40 +
    Math.min(30, data.workoutCount * 2) +
    Math.min(30, data.streak * 3)
  );

  const bodyScore = Math.min(100,
    (data.hasWeight ? 40 : 0) +
    Math.min(60, data.prCount * 6)
  );

  const fuelScore = Math.min(100,
    (data.hasFuel ? 50 : 0) +
    (data.todayKcal > 0 && data.targetKcal > 0
      ? Math.max(0, 50 - Math.abs(data.todayKcal - data.targetKcal) / data.targetKcal * 100)
      : 0)
  );

  const consistencyScore = Math.min(100,
    Math.min(50, data.streak * 5) +
    Math.min(50, data.weekWorkouts / Math.max(data.weekPlanned, 1) * 50)
  );

  const performanceScore = Math.min(100, data.prCount * 10);

  const score = Math.round(
    trainingScore * 0.30 +
    bodyScore * 0.20 +
    fuelScore * 0.20 +
    consistencyScore * 0.20 +
    performanceScore * 0.10
  );

  // Confiance
  let confidence: NoxScoreResult['confidence'];
  let confidenceReason: string;

  if (weeksOfData >= 4 && data.workoutCount >= 8 && data.hasWeight) {
    confidence = 'élevée';
    confidenceReason = `${weeksOfData} semaines de données`;
  } else if (weeksOfData >= 2 || data.workoutCount >= 4) {
    confidence = 'moyenne';
    confidenceReason = 'Score en cours de calibration';
  } else {
    confidence = 'faible';
    confidenceReason = 'Moins de 2 semaines de données — reviens dimanche';
  }

  return {
    score,
    confidence,
    confidenceReason,
    components: {
      training: Math.round(trainingScore),
      body: Math.round(bodyScore),
      fuel: Math.round(fuelScore),
      consistency: Math.round(consistencyScore),
      performance: Math.round(performanceScore),
    },
    weeksOfData,
  };
}

// ─── PROGRESSIVE OVERLOAD ────────────────────────────────────────────────────
export interface OverloadSuggestion {
  exerciseName: string;
  currentWeight: number;
  suggestedWeight: number;
  reason: string;
  confidence: 'haute' | 'moyenne';
}

export function calculateProgressiveOverload(
  exerciseName: string,
  recentSets: { weight: number; reps: number; set_number: number; created_at: string }[],
  targetRepsMin: number,
  targetRepsMax: number
): OverloadSuggestion | null {
  if (recentSets.length < 3) return null;

  // Grouper par séance (date)
  const bySession: Record<string, typeof recentSets> = {};
  recentSets.forEach(s => {
    const day = s.created_at.split('T')[0];
    if (!bySession[day]) bySession[day] = [];
    bySession[day].push(s);
  });

  const sessions = Object.values(bySession).sort((a, b) =>
    new Date(b[0].created_at).getTime() - new Date(a[0].created_at).getTime()
  );

  if (sessions.length < 2) return null;

  const lastSession = sessions[0];
  const currentWeight = lastSession[0]?.weight || 0;
  if (!currentWeight) return null;

  // Vérifier si toutes les séries de la dernière séance sont dans/au-dessus de la plage haute
  const allAboveMax = lastSession.every(s => s.reps >= targetRepsMax);
  const allAboveMin = lastSession.every(s => s.reps >= targetRepsMin);

  // Vérifier sur 2 séances consécutives
  const prevSession = sessions[1];
  const prevAllAboveMax = prevSession?.every(s => s.reps >= targetRepsMax);

  if (allAboveMax && prevAllAboveMax) {
    // 2 séances au-dessus → augmenter
    const increment = currentWeight >= 100 ? 5 : currentWeight >= 50 ? 2.5 : 1.25;
    return {
      exerciseName,
      currentWeight,
      suggestedWeight: currentWeight + increment,
      reason: `Tu as dépassé ${targetRepsMax} reps sur 2 séances — augmente de ${increment}kg`,
      confidence: 'haute',
    };
  }

  if (allAboveMax && !prevAllAboveMax) {
    const increment = currentWeight >= 100 ? 2.5 : 1.25;
    return {
      exerciseName,
      currentWeight,
      suggestedWeight: currentWeight + increment,
      reason: `Tu atteins la plage haute — essaie +${increment}kg la prochaine fois`,
      confidence: 'moyenne',
    };
  }

  return null;
}

// ─── DÉTECTION STAGNATION ─────────────────────────────────────────────────────
export function detectStagnation(
  recentSets: { weight: number; reps: number; created_at: string }[]
): { stagnating: boolean; weeksStagnating: number; suggestion: string } {
  if (recentSets.length < 6) return { stagnating: false, weeksStagnating: 0, suggestion: '' };

  const bySession: Record<string, typeof recentSets> = {};
  recentSets.forEach(s => {
    const day = s.created_at.split('T')[0];
    if (!bySession[day]) bySession[day] = [];
    bySession[day].push(s);
  });

  const sessions = Object.values(bySession).sort((a, b) =>
    new Date(b[0].created_at).getTime() - new Date(a[0].created_at).getTime()
  ).slice(0, 4);

  if (sessions.length < 3) return { stagnating: false, weeksStagnating: 0, suggestion: '' };

  // Volume par séance
  const volumes = sessions.map(s => s.reduce((acc, set) => acc + set.weight * set.reps, 0));
  const maxDelta = Math.max(...volumes) - Math.min(...volumes);
  const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;

  if (maxDelta / avgVolume < 0.05) {
    return {
      stagnating: true,
      weeksStagnating: sessions.length,
      suggestion: 'Volume stable depuis 3+ séances. Essaie : +1 série, changer les reps, ou nouvel exercice.',
    };
  }

  return { stagnating: false, weeksStagnating: 0, suggestion: '' };
}
