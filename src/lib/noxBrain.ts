/**
 * NOX BRAIN — La couche d'intelligence qui relie les données aux décisions.
 * TDEE réel, NOX Score, surcharge progressive et détection de stagnation.
 */

// ─── HELPERS ────────────────────────────────────────────────────────────────
const DAY_MS = 1000 * 60 * 60 * 24;

function finitePositive(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function dayKey(date: string): string {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function roundToIncrement(value: number, increment: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(increment) || increment <= 0) return value;
  return Math.round(value / increment) * increment;
}

function getLoadIncrement(weight: number): number {
  if (weight >= 100) return 2.5;
  if (weight >= 40) return 2.5;
  return 1.25;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

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
  profile: {
    height_cm?: number;
    starting_weight_kg?: number;
    activity_level?: string;
    date_of_birth?: string;
    gender?: string;
    sex?: string;
  }
): TDEEResult {
  const validWeights = bodyLogs
    .map(log => ({
      weight: finitePositive(log.weight),
      created_at: log.created_at,
      time: new Date(log.created_at).getTime(),
    }))
    .filter(log => log.weight !== null && Number.isFinite(log.time))
    .sort((a, b) => a.time - b.time);

  if (validWeights.length < 2) {
    return {
      tdeeReal: null,
      tdeeFormula: null,
      delta: null,
      confidence: 'insuffisant',
      weeksOfData: 0,
      insight: null,
    };
  }

  const newest = validWeights[validWeights.length - 1];

  // Utiliser une fenêtre récente limite l'effet d'un ancien poids qui n'a rien à voir
  // avec les apports alimentaires actuellement enregistrés.
  const maxWindowStart = newest.time - 42 * DAY_MS;
  const windowWeights = validWeights.filter(log => log.time >= maxWindowStart);
  const usableWeights = windowWeights.length >= 2 ? windowWeights : validWeights;

  const oldest = usableWeights[0];
  const spanDays = Math.max(1, (newest.time - oldest.time) / DAY_MS);
  const weeksOfData = Math.max(0, Math.floor(spanDays / 7));

  // On agrège les calories PAR JOUR. L'ancien calcul divisait la somme des
  // entrées par le nombre de jours calendaires même si certains jours n'étaient
  // pas suivis, ce qui pouvait fortement sous-estimer le TDEE.
  const caloriesByDay = new Map<string, number>();
  for (const entry of foodEntries) {
    const time = new Date(entry.created_at).getTime();
    const calories = Number(entry.calories);
    if (!Number.isFinite(time) || !Number.isFinite(calories) || calories < 0) continue;
    if (time < oldest.time || time > newest.time + DAY_MS) continue;

    const key = dayKey(entry.created_at);
    if (!key) continue;
    caloriesByDay.set(key, (caloriesByDay.get(key) || 0) + calories);
  }

  const trackedDailyCalories = [...caloriesByDay.values()].filter(v => v > 0);
  const expectedDays = Math.max(1, Math.floor(spanDays) + 1);
  const coverage = trackedDailyCalories.length / expectedDays;

  // Pour déduire un TDEE "réel", il faut des journées réellement suivies.
  // Sinon on préfère ne rien conclure plutôt que fabriquer un chiffre précis.
  if (spanDays < 7 || trackedDailyCalories.length < 7 || coverage < 0.6) {
    return {
      tdeeReal: null,
      tdeeFormula: calculateFormulaTDEE(
        newest.weight as number,
        profile,
      ),
      delta: null,
      confidence: 'insuffisant',
      weeksOfData,
      insight: 'Continue à enregistrer tes repas et ton poids régulièrement pour calibrer ton besoin énergétique réel.',
    };
  }

  const avgCalories =
    trackedDailyCalories.reduce((sum, calories) => sum + calories, 0) /
    trackedDailyCalories.length;

  const weightChangeKg = (newest.weight as number) - (oldest.weight as number);

  // 7700 kcal/kg est une approximation énergétique utile pour une tendance,
  // pas une mesure directe de graisse corporelle.
  const estimatedDailyEnergyChange = (weightChangeKg * 7700) / spanDays;
  const rawTdee = avgCalories - estimatedDailyEnergyChange;

  // Une valeur aberrante indique généralement des données trop bruitées ou
  // incomplètes. On ne la transforme pas en recommandation.
  const tdeeReal =
    Number.isFinite(rawTdee) && rawTdee >= 1000 && rawTdee <= 6000
      ? Math.round(rawTdee)
      : null;

  const tdeeFormula = calculateFormulaTDEE(newest.weight as number, profile);
  const delta =
    tdeeReal !== null && tdeeFormula !== null
      ? tdeeReal - tdeeFormula
      : null;

  let confidence: TDEEResult['confidence'] = 'faible';
  if (tdeeReal === null) {
    confidence = 'insuffisant';
  } else if (spanDays >= 28 && trackedDailyCalories.length >= 24 && coverage >= 0.8) {
    confidence = 'haute';
  } else if (spanDays >= 14 && trackedDailyCalories.length >= 12 && coverage >= 0.7) {
    confidence = 'moyenne';
  }

  let insight: string | null = null;

  if (tdeeReal === null) {
    insight = 'Les données actuelles sont trop irrégulières pour estimer ton besoin énergétique réel avec confiance.';
  } else if (delta !== null && Math.abs(delta) >= 150) {
    insight =
      delta < 0
        ? `Tes données récentes suggèrent une dépense autour de ${tdeeReal} kcal/j, soit environ ${Math.abs(delta)} kcal sous l'estimation théorique. Utilise cette tendance avec prudence et continue le suivi.`
        : `Tes données récentes suggèrent une dépense autour de ${tdeeReal} kcal/j, soit environ ${delta} kcal au-dessus de l'estimation théorique. Continue le suivi pour confirmer la tendance.`;
  } else if (tdeeReal !== null) {
    insight = `Tes données récentes suggèrent une dépense autour de ${tdeeReal} kcal/j. Cette estimation se précisera avec davantage de journées complètes.`;
  }

  return {
    tdeeReal,
    tdeeFormula,
    delta,
    confidence,
    weeksOfData,
    insight,
  };
}

function calculateFormulaTDEE(
  currentWeight: number,
  profile: {
    height_cm?: number;
    starting_weight_kg?: number;
    activity_level?: string;
    date_of_birth?: string;
    gender?: string;
    sex?: string;
  }
): number | null {
  const weight = finitePositive(currentWeight) || finitePositive(profile.starting_weight_kg);
  const height = finitePositive(profile.height_cm);
  if (!weight || !height) return null;

  let age = 30;
  if (profile.date_of_birth) {
    const birth = new Date(profile.date_of_birth);
    if (!Number.isNaN(birth.getTime())) {
      age = clamp(Math.floor((Date.now() - birth.getTime()) / (365.2425 * DAY_MS)), 14, 100);
    }
  }

  const sex = String(profile.sex || profile.gender || '').toLowerCase();
  let sexConstant = 0;

  if (['male', 'man', 'homme', 'm'].includes(sex)) sexConstant = 5;
  else if (['female', 'woman', 'femme', 'f'].includes(sex)) sexConstant = -161;
  else {
    // Si le profil ne contient pas cette donnée, ne pas supposer "homme".
    // On prend le milieu des deux constantes Mifflin comme approximation neutre.
    sexConstant = (5 - 161) / 2;
  }

  const bmr = 10 * weight + 6.25 * height - 5 * age + sexConstant;

  const activity = String(profile.activity_level || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const activityMultipliers: Record<string, number> = {
    sedentaire: 1.2,
    sedentary: 1.2,
    'legerement actif': 1.375,
    light: 1.375,
    'moderement actif': 1.55,
    moderate: 1.55,
    'tres actif': 1.725,
    active: 1.725,
    'extremement actif': 1.9,
    'very active': 1.9,
  };

  const multiplier = activityMultipliers[activity] || 1.55;
  return Math.round(bmr * multiplier);
}

// ─── NOX SCORE AVEC CONFIANCE ───────────────────────────────────────────────
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
  const firstWorkoutTime = data.firstWorkoutDate
    ? new Date(data.firstWorkoutDate).getTime()
    : NaN;

  const weeksOfData = Number.isFinite(firstWorkoutTime)
    ? Math.max(1, Math.floor((Date.now() - firstWorkoutTime) / (DAY_MS * 7)))
    : 0;

  const planned = Math.max(Number(data.weekPlanned) || 0, 1);
  const weekWorkouts = Math.max(Number(data.weekWorkouts) || 0, 0);
  const workoutCount = Math.max(Number(data.workoutCount) || 0, 0);
  const streak = Math.max(Number(data.streak) || 0, 0);
  const prCount = Math.max(Number(data.prCount) || 0, 0);

  const adherence = clamp(weekWorkouts / planned, 0, 1);

  const trainingScore = Math.min(
    100,
    adherence * 55 +
      Math.min(25, workoutCount * 1.5) +
      Math.min(20, streak * 2),
  );

  // Le suivi corporel ne doit pas être "récompensé" par les PRs : ce sont
  // deux dimensions différentes.
  const bodyScore = data.hasWeight ? 100 : 0;

  let nutritionAccuracy = 0;
  if (data.hasFuel && data.todayKcal > 0 && data.targetKcal > 0) {
    const deviation = Math.abs(data.todayKcal - data.targetKcal) / data.targetKcal;
    nutritionAccuracy = clamp(1 - deviation, 0, 1) * 50;
  }

  const fuelScore = Math.min(100, (data.hasFuel ? 50 : 0) + nutritionAccuracy);

  const consistencyScore = Math.min(
    100,
    adherence * 65 + Math.min(35, streak * 3.5),
  );

  // Un PR est un signal positif, mais son absence ne signifie pas mauvaise
  // performance. Le score monte progressivement plutôt que de dominer le total.
  const performanceScore = Math.min(100, prCount * 12.5);

  const score = Math.round(
    trainingScore * 0.3 +
      bodyScore * 0.15 +
      fuelScore * 0.2 +
      consistencyScore * 0.25 +
      performanceScore * 0.1,
  );

  let confidence: NoxScoreResult['confidence'];
  let confidenceReason: string;

  if (weeksOfData >= 4 && workoutCount >= 8 && data.hasWeight && data.hasFuel) {
    confidence = 'élevée';
    confidenceReason = `${weeksOfData} semaines avec entraînement, poids et nutrition`;
  } else if (weeksOfData >= 2 || workoutCount >= 4) {
    confidence = 'moyenne';
    confidenceReason = 'Score en cours de calibration';
  } else {
    confidence = 'faible';
    confidenceReason = 'Moins de 2 semaines de données — le score va se préciser';
  }

  return {
    score: clamp(score, 0, 100),
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


type TrainingSetLike = {
  weight: number;
  reps: number;
  created_at: string;
  workout_id?: string;
  set_number?: number;
  rir?: number;
  rpe?: number;
};

function sessionKey(set: TrainingSetLike): string {
  const workoutId = String(set.workout_id || '').trim();
  return workoutId ? `workout:${workoutId}` : `day:${dayKey(set.created_at)}`;
}

function groupTrainingSessions<T extends TrainingSetLike>(sets: T[]): T[][] {
  const groups = new Map<string, T[]>();

  for (const set of sets) {
    const key = sessionKey(set);
    if (!key.endsWith(':')) {
      const current = groups.get(key) || [];
      current.push(set);
      groups.set(key, current);
    }
  }

  return [...groups.values()].sort((a, b) => {
    const latestA = Math.max(...a.map(set => new Date(set.created_at).getTime()));
    const latestB = Math.max(...b.map(set => new Date(set.created_at).getTime()));
    return latestB - latestA;
  });
}

// ─── PROGRESSIVE OVERLOAD ───────────────────────────────────────────────────
export interface OverloadSuggestion {
  exerciseName: string;
  currentWeight: number;
  suggestedWeight: number;
  reason: string;
  confidence: 'haute' | 'moyenne';
}

export function calculateProgressiveOverload(
  exerciseName: string,
  recentSets: {
    weight: number;
    reps: number;
    set_number: number;
    created_at: string;
    workout_id?: string;
    rir?: number;
    rpe?: number;
  }[],
  targetRepsMin: number,
  targetRepsMax: number
): OverloadSuggestion | null {
  const minReps = Math.max(1, Math.floor(Number(targetRepsMin) || 1));
  const maxReps = Math.max(minReps, Math.floor(Number(targetRepsMax) || minReps));

  const validSets = recentSets
    .filter(set => {
      const weight = Number(set.weight);
      const reps = Number(set.reps);
      return (
        Number.isFinite(weight) &&
        weight > 0 &&
        Number.isFinite(reps) &&
        reps > 0 &&
        Boolean(dayKey(set.created_at))
      );
    })
    .map(set => ({
      ...set,
      weight: Number(set.weight),
      reps: Number(set.reps),
    }));

  if (validSets.length < 3) return null;

  // workout_id est prioritaire : deux séances le même jour restent distinctes.
  // Fallback par jour uniquement pour les anciennes données sans workout_id.
  const sessions = groupTrainingSessions(validSets);

  if (sessions.length < 1) return null;

  const lastSession = sessions[0];
  const workingSets = lastSession.filter(set => set.weight > 0);
  if (workingSets.length < 2) return null;

  // On utilise la charge dominante de la dernière séance plutôt que le premier
  // set uniquement (qui peut être un échauffement).
  const weightCounts = new Map<number, number>();
  workingSets.forEach(set => {
    weightCounts.set(set.weight, (weightCounts.get(set.weight) || 0) + 1);
  });

  const currentWeight =
    [...weightCounts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0]?.[0] || 0;

  if (!currentWeight) return null;

  const comparableLast = workingSets.filter(set => Math.abs(set.weight - currentWeight) < 0.001);
  if (comparableLast.length < 2) return null;

  const hitTopLast = comparableLast.every(set => set.reps >= maxReps);

  // Si RIR/RPE existe, on évite de recommander une hausse quand la plage haute
  // a été obtenue au prix d'un effort maximal.
  const effortAcceptable = comparableLast.every(set => {
    const rir = Number(set.rir);
    if (Number.isFinite(rir)) return rir >= 1;
    const rpe = Number(set.rpe);
    if (Number.isFinite(rpe)) return rpe <= 9;
    return true;
  });

  if (!hitTopLast || !effortAcceptable) return null;

  const previousSession = sessions[1];
  let confirmedTwice = false;

  if (previousSession) {
    const previousComparable = previousSession.filter(
      set => Math.abs(set.weight - currentWeight) < 0.001,
    );
    confirmedTwice =
      previousComparable.length >= 2 &&
      previousComparable.every(set => set.reps >= maxReps) &&
      previousComparable.every(set => {
        const rir = Number(set.rir);
        if (Number.isFinite(rir)) return rir >= 1;
        const rpe = Number(set.rpe);
        if (Number.isFinite(rpe)) return rpe <= 9;
        return true;
      });
  }

  const increment = getLoadIncrement(currentWeight);
  const suggestedWeight = roundToIncrement(currentWeight + increment, 1.25);

  if (confirmedTwice) {
    return {
      exerciseName,
      currentWeight,
      suggestedWeight,
      reason: `Plage haute (${maxReps} reps) validée sur 2 séances à charge comparable : augmente légèrement la charge et repars vers le bas de la plage ${minReps}-${maxReps}.`,
      confidence: 'haute',
    };
  }

  return {
    exerciseName,
    currentWeight,
    suggestedWeight,
    reason: `Plage haute (${maxReps} reps) validée avec une marge d'effort acceptable. Une petite hausse de charge est possible ; repars ensuite vers ${minReps} reps.`,
    confidence: 'moyenne',
  };
}

// ─── DÉTECTION STAGNATION ───────────────────────────────────────────────────
export function detectStagnation(
  recentSets: {
    weight: number;
    reps: number;
    created_at: string;
    workout_id?: string;
    rir?: number;
    rpe?: number;
  }[]
): { stagnating: boolean; weeksStagnating: number; suggestion: string } {
  const validSets = recentSets
    .filter(set => {
      const weight = Number(set.weight);
      const reps = Number(set.reps);
      return (
        Number.isFinite(weight) &&
        weight > 0 &&
        Number.isFinite(reps) &&
        reps > 0 &&
        Boolean(dayKey(set.created_at))
      );
    })
    .map(set => ({
      ...set,
      weight: Number(set.weight),
      reps: Number(set.reps),
    }));

  if (validSets.length < 6) {
    return { stagnating: false, weeksStagnating: 0, suggestion: '' };
  }

  // Même définition de séance que la surcharge progressive.
  const sessions = groupTrainingSessions(validSets).slice(0, 5);

  if (sessions.length < 3) {
    return { stagnating: false, weeksStagnating: 0, suggestion: '' };
  }

  // Un simple tonnage stable n'est pas une stagnation : 3x8 à 100 puis 3x10 à
  // 100 est une progression malgré une variation parfois faible du volume.
  // On suit donc le meilleur set et le tonnage de chaque exposition.
  const metrics = sessions.map(session => {
    const bestSet = session.reduce(
      (best, set) => {
        const estimated1RM = set.weight * (1 + set.reps / 30);
        return estimated1RM > best.estimated1RM
          ? { estimated1RM, weight: set.weight, reps: set.reps }
          : best;
      },
      { estimated1RM: 0, weight: 0, reps: 0 },
    );

    const volume = session.reduce(
      (sum, set) => sum + set.weight * set.reps,
      0,
    );

    return {
      date: new Date(session[0].created_at).getTime(),
      bestEstimated1RM: bestSet.estimated1RM,
      bestWeight: bestSet.weight,
      bestReps: bestSet.reps,
      volume,
    };
  });

  const newest = metrics[0];
  const oldest = metrics[metrics.length - 1];

  const strengthProgress =
    oldest.bestEstimated1RM > 0
      ? (newest.bestEstimated1RM - oldest.bestEstimated1RM) /
        oldest.bestEstimated1RM
      : 0;

  const volumeProgress =
    oldest.volume > 0
      ? (newest.volume - oldest.volume) / oldest.volume
      : 0;

  const declining =
    strengthProgress < -0.03 || volumeProgress < -0.08;

  const noMeaningfulProgress =
    declining ||
    (Math.abs(strengthProgress) < 0.02 && Math.abs(volumeProgress) < 0.03);

  if (!noMeaningfulProgress) {
    return { stagnating: false, weeksStagnating: 0, suggestion: '' };
  }

  const spanDays = Math.max(1, Math.abs(newest.date - oldest.date) / DAY_MS);

  // Trois expositions rapprochées ne suffisent pas pour annoncer une stagnation.
  // Une baisse nette reste signalée immédiatement, mais une performance simplement
  // stable doit persister au moins ~10 jours avant d'être qualifiée de stagnation.
  if (!declining && spanDays < 10) {
    return { stagnating: false, weeksStagnating: 0, suggestion: '' };
  }

  const weeksStagnating = Math.max(1, Math.round(spanDays / 7));

  if (declining) {
    return {
      stagnating: true,
      weeksStagnating,
      suggestion:
        'Les performances baissent sur plusieurs expositions. Vérifie d’abord sommeil, récupération, douleur, technique et adhérence. Si la fatigue est élevée, réduis temporairement le volume ou la charge avant de chercher à progresser.',
    };
  }

  return {
    stagnating: true,
    weeksStagnating,
    suggestion:
      'Pas de progression mesurable sur au moins 3 expositions. Ne change pas tout : vérifie d’abord la récupération et la technique, puis ajuste une seule variable (reps, petite hausse de charge ou volume) si nécessaire.',
  };
}
