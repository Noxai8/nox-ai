// ── NOX Priority Engine V1 ────────────────────────────────────────────────────
// 100 % déterministe. Pas d'IA. Même entrée = même sortie.

export type Confidence = 'low' | 'moderate' | 'high';

export type EvidenceItem = {
  key: string;
  label: string;
  value: string;
};

export type Priority = {
  type: 'recovery' | 'sleep' | 'activity' | 'nutrition' | 'focus' | 'hydration' | 'consistency';
  title: string;
  action: string;
  reason: string;
  score: number;
  confidence: Confidence;
  evidence: EvidenceItem[];
};

export type NonePriority = {
  type: 'none';
  reason: string;
  confidence: Confidence;
  evidence: EvidenceItem[];
};

export type DailyPriority = Priority | NonePriority;

// ── Input ─────────────────────────────────────────────────────────────────────

export type PulseInput = {
  sleep_score: number;
  energy_score: number;
  body_score: number;
} | null;

export type ProfileInput = {
  goal_type?: string | null;
  session_length_min?: number | null;
  /** Axes choisis par l'utilisateur. Absent (null) = tous ; liste vide = aucun (ex. habitudes seules). */
  focus_areas?: string[] | null;
} | null;

/** L'axe est-il actif pour cet utilisateur ? */
function hasFocus(ctx: PriorityContext, area: 'movement' | 'nutrition' | 'recovery' | 'focus'): boolean {
  const f = ctx.profile?.focus_areas;
  return f == null || f.includes(area);
}

export type ActivityInput = {
  last_session_feedback?: 'hard' | 'good' | 'easy' | null;
  days_since_last_session?: number | null;
  session_planned_today?: boolean;
} | null;

export type NutritionInput = {
  calories_logged?: number | null;
  protein_logged?: number | null;
  calories_target?: number | null;
  protein_target?: number | null;
  days_logged_last_7?: number | null;
} | null;

// Contexte temporel explicite — jamais new Date() dans le moteur
export type TemporalContext = {
  localDate: string; // YYYY-MM-DD
  localHour: number; // 0–23
};

export type PriorityContext = {
  pulse:          PulseInput;
  profile:        ProfileInput;
  recentActivity: ActivityInput;
  nutrition:      NutritionInput;
  context:        TemporalContext;
  /** Mission du jour (pilier Focus), si définie */
  mission?:       MissionInput;
};

export type MissionInput = {
  title: string;
  done: boolean;
  remaining_minutes: number | null; // null = mission de type tâche
} | null;

// ── Constantes ────────────────────────────────────────────────────────────────

const INTERVENTION_THRESHOLD = 50;

// ── Helpers ───────────────────────────────────────────────────────────────────

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n));
}

function confidenceFromDataCount(count: number): Confidence {
  if (count >= 3) return 'high';
  if (count >= 2) return 'moderate';
  return 'low';
}

type Candidate = { priority: Priority; dataPointCount: number };

// ── Candidats ─────────────────────────────────────────────────────────────────

function evalRecovery(ctx: PriorityContext): Candidate | null {
  const { pulse, recentActivity } = ctx;
  if (!pulse) return null;

  const evidence: EvidenceItem[] = [];
  let score = 0;
  let dataCount = 0;

  // Corps — règle métier différenciée
  if (pulse.body_score === 1) {
    score += 40;
    dataCount++;
    evidence.push({ key: 'body_score', label: 'Corps', value: `${pulse.body_score}/5` });
  } else if (pulse.body_score === 2) {
    score += 35;
    dataCount++;
    evidence.push({ key: 'body_score', label: 'Corps', value: `${pulse.body_score}/5` });
  } else if (pulse.body_score === 3) {
    score += 10;
    dataCount++;
  }

  // Bonus si corps dégradé ET séance prévue — signal de conflit fort
  if (pulse.body_score <= 2 && recentActivity?.session_planned_today) {
    score += 20;
    evidence.push({ key: 'session_planned_today', label: 'Séance prévue', value: 'Oui — mais corps dégradé' });
  }

  // Énergie basse
  if (pulse.energy_score <= 2) {
    score += 35;
    dataCount++;
    evidence.push({ key: 'energy_score', label: 'Énergie', value: `${pulse.energy_score}/5` });
  } else if (pulse.energy_score === 3) {
    score += 10;
    dataCount++;
  }

  // Dernière séance difficile récente
  if (
    recentActivity?.last_session_feedback === 'hard' &&
    recentActivity.days_since_last_session != null &&
    recentActivity.days_since_last_session <= 1
  ) {
    score += 20;
    dataCount++;
    evidence.push({ key: 'last_session_feedback', label: 'Dernière séance', value: 'Difficile' });
  }

  if (score < 1) return null;

  return {
    dataPointCount: dataCount,
    priority: {
      type: 'recovery',
      title: "Récupère aujourd'hui",
      action: 'Privilégie une journée légère : marche, étirements ou repos complet.',
      reason: "Ton énergie et ton état physique indiquent que ton corps a besoin de récupération.",
      score: clamp(score),
      confidence: confidenceFromDataCount(dataCount),
      evidence,
    },
  };
}

function evalSleep(ctx: PriorityContext): Candidate | null {
  const { pulse } = ctx;
  if (!pulse) return null;

  const evidence: EvidenceItem[] = [];
  let score = 0;
  let dataCount = 0;

  if (pulse.sleep_score <= 2) {
    score += 70;
    dataCount++;
    evidence.push({ key: 'sleep_score', label: 'Sommeil', value: `${pulse.sleep_score}/5` });
  } else if (pulse.sleep_score === 3 && pulse.energy_score <= 2) {
    score += 40;
    dataCount += 2;
    evidence.push({ key: 'sleep_score', label: 'Sommeil', value: `${pulse.sleep_score}/5` });
    evidence.push({ key: 'energy_score', label: 'Énergie', value: `${pulse.energy_score}/5` });
  }

  if (score < 1) return null;

  return {
    dataPointCount: dataCount,
    priority: {
      type: 'sleep',
      title: 'Protège ton sommeil ce soir',
      action: "Essaie de te coucher 30 à 60 minutes plus tôt que d'habitude.",
      reason: `Ton sommeil de cette nuit était ${pulse.sleep_score <= 2 ? 'insuffisant' : 'moyen'}.`,
      score: clamp(score),
      confidence: confidenceFromDataCount(dataCount),
      evidence,
    },
  };
}

function evalActivity(ctx: PriorityContext): Candidate | null {
  const { pulse, recentActivity } = ctx;

  // Règle de sécurité métier : corps très dégradé → pas de recommandation d'activité
  if (pulse && pulse.body_score <= 2) return null;

  const evidence: EvidenceItem[] = [];
  let score = 0;
  let dataCount = 0;

  if (recentActivity?.session_planned_today && pulse && pulse.energy_score >= 3) {
    score += 65;
    dataCount++;
    evidence.push({ key: 'session_planned_today', label: 'Séance prévue', value: 'Oui' });
    evidence.push({ key: 'energy_score', label: 'Énergie', value: `${pulse.energy_score}/5` });
  }

  if (
    recentActivity?.days_since_last_session != null &&
    recentActivity.days_since_last_session >= 3 &&
    pulse && pulse.energy_score >= 3
  ) {
    score += 40;
    dataCount++;
    evidence.push({ key: 'days_since_last_session', label: 'Dernière activité', value: `il y a ${recentActivity.days_since_last_session} jours` });
  }

  if (score < 1) return null;

  return {
    dataPointCount: dataCount,
    priority: {
      type: 'activity',
      title: "Bouge aujourd'hui",
      action: recentActivity?.session_planned_today
        ? "Ta séance est prévue. C'est le bon moment pour la faire."
        : "Même une courte sortie ou une marche de 20 minutes compte.",
      reason: recentActivity?.session_planned_today
        ? "Tu as une séance prévue et ton état physique est bon."
        : "Tu n'as pas bougé depuis quelques jours et ton énergie est suffisante.",
      score: clamp(score),
      confidence: confidenceFromDataCount(dataCount),
      evidence,
    },
  };
}

// Mission du jour : priorité par défaut quand l'état du jour le permet.
// Jamais proposée avec une énergie ou un corps bas : la récupération passe avant.
function evalFocus(ctx: PriorityContext): Candidate | null {
  const { pulse, mission } = ctx;
  if (!pulse || !mission || mission.done) return null;
  if (pulse.energy_score < 3 || pulse.body_score < 3) return null;

  const evidence: EvidenceItem[] = [
    { key: 'mission', label: 'Mission du jour', value: mission.title },
    { key: 'energy_score', label: 'Énergie', value: `${pulse.energy_score}/5` },
  ];
  if (mission.remaining_minutes != null) {
    evidence.push({ key: 'remaining', label: 'Reste', value: `${mission.remaining_minutes} min` });
  }
  const deep = pulse.energy_score >= 4 && pulse.sleep_score >= 4;
  return {
    dataPointCount: 2,
    priority: {
      type: 'focus',
      title: 'Avance sur ta mission',
      action: mission.remaining_minutes != null
        ? (deep ? 'Bon moment pour du travail profond : lance un bloc de 50 min.' : 'Lance un bloc de 50 min sur ta mission.')
        : 'Bloque un moment aujourd’hui pour la terminer.',
      reason: 'Tes signaux du jour sont bons et ta mission n’est pas encore accomplie.',
      score: 55,
      confidence: 'moderate',
      evidence,
    },
  };
}

function evalNutrition(ctx: PriorityContext): Candidate | null {
  const { nutrition, context } = ctx;
  if (!nutrition) return null;

  const evidence: EvidenceItem[] = [];
  let score = 0;
  let dataCount = 0;

  // Protéines insuffisantes — seulement si données disponibles ET heure pertinente (≥ 14h)
  if (
    nutrition.protein_logged != null &&
    nutrition.protein_target != null &&
    nutrition.protein_logged < nutrition.protein_target * 0.5 &&
    context.localHour >= 14
  ) {
    score += 55; // élevé à 55 pour dépasser le seuil
    dataCount++;
    evidence.push({
      key: 'protein_logged',
      label: 'Protéines',
      value: `${nutrition.protein_logged}g / ${nutrition.protein_target}g`,
    });
  }

  // Calories très insuffisantes après 14h
  if (
    nutrition.calories_logged != null &&
    nutrition.calories_target != null &&
    nutrition.calories_logged < nutrition.calories_target * 0.35 &&
    context.localHour >= 14
  ) {
    score += 35;
    dataCount++;
    evidence.push({
      key: 'calories_logged',
      label: 'Calories',
      value: `${nutrition.calories_logged} / ${nutrition.calories_target} kcal`,
    });
  }

  // Journées non renseignées — signal faible
  if (nutrition.days_logged_last_7 != null && nutrition.days_logged_last_7 <= 2) {
    score += 30;
    dataCount++;
    evidence.push({
      key: 'days_logged_last_7',
      label: 'Suivi nutritionnel',
      value: `${nutrition.days_logged_last_7}/7 jours renseignés`,
    });
  }

  if (score < 1) return null;

  return {
    dataPointCount: dataCount,
    priority: {
      type: 'nutrition',
      title: 'Ton prochain repas compte',
      action:
        nutrition.protein_logged != null &&
        nutrition.protein_target != null &&
        nutrition.protein_logged < nutrition.protein_target * 0.5
          ? 'Ajoute une source de protéines à ton prochain repas.'
          : 'Renseigne ce que tu manges pour que NOX puisse suivre ton apport.',
      reason: "Ton apport nutritionnel de la journée est en retard par rapport à ton objectif.",
      score: clamp(score),
      confidence: confidenceFromDataCount(dataCount),
      evidence,
    },
  };
}

// ── Moteur principal ──────────────────────────────────────────────────────────

export function generateDailyPriority(ctx: PriorityContext): DailyPriority {
  const candidates: Candidate[] = [
    evalRecovery(ctx),
    evalSleep(ctx),
    hasFocus(ctx, 'movement') ? evalActivity(ctx) : null,
    hasFocus(ctx, 'nutrition') ? evalNutrition(ctx) : null,
    hasFocus(ctx, 'focus') ? evalFocus(ctx) : null,
  ].filter((c): c is Candidate => c !== null);

  candidates.sort((a, b) => b.priority.score - a.priority.score);

  const winner = candidates[0];

  if (!winner || winner.priority.score < INTERVENTION_THRESHOLD) {
    const evidence: EvidenceItem[] = [];
    if (ctx.pulse) {
      evidence.push({ key: 'sleep_score',  label: 'Sommeil', value: `${ctx.pulse.sleep_score}/5` });
      evidence.push({ key: 'energy_score', label: 'Énergie', value: `${ctx.pulse.energy_score}/5` });
      evidence.push({ key: 'body_score',   label: 'Corps',   value: `${ctx.pulse.body_score}/5` });
    }
    return {
      type: 'none',
      reason: ctx.pulse
        ? "Tes signaux sont bons. Continue normalement — NOX n'a pas de raison suffisante de te demander de modifier quelque chose."
        : "NOX n'a pas encore assez de données pour te proposer une priorité aujourd'hui.",
      confidence: ctx.pulse ? 'moderate' : 'low',
      evidence,
    };
  }

  return { ...winner.priority, confidence: confidenceFromDataCount(winner.dataPointCount) };
}
