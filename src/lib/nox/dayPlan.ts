// ── NOX — « Ta journée » : engagements actifs du jour ────────────────────────
// Fonction pure : aucune donnée inventée, aucun calcul d'XP (le serveur reste seul juge).
// Chaque ligne n'apparaît que si elle s'applique à l'utilisateur (axes, habitudes, mission).

import { habitName, isMeasured, isTargetMet, targetLine, type UserHabit } from './habits';

export type DayPlanItem = {
  key: string;
  label: string;
  detail?: string;
  /** Valeur saisie manuellement (pas) : affichée « DÉCLARÉ » */
  declared?: boolean;
  /** Valeur fournie par une source native (Apple Santé / Health Connect) : « MESURÉ » */
  measured?: boolean;
  done: boolean;
  route: string;
  /** Clôture : toujours accessible, même si tout n'est pas fait */
  closure?: boolean;
};

export type DayPlanInput = {
  focusAreas: string[] | null;          // null = comptes historiques (tous les axes)
  pulseDone: boolean;
  closureDone: boolean;
  priorityType: string;                  // 'recovery' = jour de récupération
  mission: { title: string; kind: 'duration' | 'task'; target_minutes: number | null; done: boolean; minutes: number } | null;
  session: { name: string } | null;      // séance prévue aujourd'hui
  movedToday: boolean;                   // séance terminée ou activité enregistrée
  caloriesTarget: number;                // 0 = pas de cible
  kcalToday: number;
  mealsToday: number;
  habits: UserHabit[];
  todayLogs: { habit_id: string; count: number; source?: string | null }[];
};

/** Zone nutrition : ±10 % autour de la cible (jamais un chiffre exact à atteindre) */
export const nutritionZone = (target: number) => ({ low: Math.round(target * 0.9), high: Math.round(target * 1.1) });

const fr = (n: number) => Math.round(n).toLocaleString('fr-FR');

export function buildDayPlan(i: DayPlanInput): DayPlanItem[] {
  const has = (area: string) => i.focusAreas == null || i.focusAreas.includes(area);
  const logOf = (h: UserHabit) => i.todayLogs.find(l => l.habit_id === h.id);
  // Seuls les objectifs actifs marqués « Dans ma journée » entrent dans le pilotage
  const dayHabits = i.habits.filter(h => h.active !== false && h.in_day !== false);
  const steps = dayHabits.find(h => h.kind === 'steps') ?? null;
  const items: DayPlanItem[] = [];

  items.push({ key: 'pulse', label: 'Pulse du matin', done: i.pulseDone, route: '/pulse' });

  if (i.mission) {
    items.push({
      key: 'mission', label: `Concentration · ${i.mission.title}`,
      detail: i.mission.kind === 'duration' ? `${i.mission.minutes} / ${i.mission.target_minutes} min` : undefined,
      done: i.mission.done, route: '/focus',
    });
  } else if (has('focus')) {
    items.push({ key: 'mission', label: 'Concentration · définir ta mission', done: false, route: '/focus' });
  }

  // Bouger : les pas déclarés s'y affichent s'ils existent. Jour de récupération : rien n'est demandé.
  const restDay = i.priorityType === 'recovery';
  if (steps && !restDay) {
    const log = logOf(steps);
    const target = steps.daily_target;
    const hasTarget = target != null && Number.isFinite(Number(target)) && Number(target) > 0;

    items.push({
      key: 'move', label: 'Bouger',
      // Jamais de cible inventée : si aucune cible n'est configurée, on affiche seulement la valeur réelle.
      detail: log
        ? hasTarget
          ? `${fr(log.count)} / ${fr(Number(target))} pas`
          : `${fr(log.count)} pas`
        : hasTarget
          ? `à saisir · objectif ${fr(Number(target))} pas`
          : 'à saisir',
      declared: !!log && !isMeasured(log.source),
      measured: !!log && isMeasured(log.source),
      done: !!log && hasTarget && isTargetMet(log.count, Number(target), 'build') === true,
      route: `/habits/${steps.id}`,
    });
  } else if (has('movement') && !restDay) {
    items.push({
      key: 'move', label: 'Bouger',
      detail: i.session ? i.session.name : 'une séance ou une activité',
      done: i.movedToday, route: i.session ? '/program' : '/movement',
    });
  }

  // Nutrition : seulement si l'axe est actif ET qu'une vraie cible existe. Calories issues des repas enregistrés
  // (validés par l'utilisateur) ; information de pilotage, sans effet sur l'XP.
  if (has('nutrition') && i.caloriesTarget > 0) {
    const z = nutritionZone(i.caloriesTarget);
    items.push({
      key: 'nutrition', label: 'Nutrition',
      detail: `${fr(i.kcalToday)} kcal · zone ${fr(z.low)}–${fr(z.high)}`,
      done: i.kcalToday >= z.low && i.kcalToday <= z.high, route: '/fuel',
    });
  }

  // Habitudes et objectifs personnels (les pas sont déjà sous « Bouger »)
  for (const h of dayHabits) {
    if (h.kind === 'steps') continue;
    const log = logOf(h);
    items.push({
      key: h.id, label: habitName(h),
      detail: log ? targetLine(log.count, h.daily_target, h.mode, h.unit) : 'à noter',
      done: !!log && (h.mode === 'track' || isTargetMet(log.count, h.daily_target, h.mode) === true),
      route: `/habits/${h.id}`,
    });
  }

  items.push({ key: 'closure', label: 'Clôture du soir', done: i.closureDone, route: '/closure', closure: true });
  return items;
}

// ── Bilan et snapshot de clôture ─────────────────────────────────────────────
// Le snapshot fige l'état de chaque engagement au moment de la clôture, pour l'historique
// et les bilans futurs. Il n'alimente jamais l'XP (calculée par le serveur à partir des données brutes).

export type DaySummary = {
  engagements: DayPlanItem[];   // tous les engagements du jour, hors clôture
  done: DayPlanItem[];
  missing: DayPlanItem[];
  complete: boolean;            // journée complète = tous les engagements applicables validés
};

export function summarizeDay(items: DayPlanItem[]): DaySummary {
  const engagements = items.filter(x => !x.closure);
  const done = engagements.filter(x => x.done);
  return { engagements, done, missing: engagements.filter(x => !x.done), complete: engagements.length > 0 && done.length === engagements.length };
}

const categoryOf = (key: string) =>
  key === 'pulse' ? 'pulse' : key === 'mission' ? 'concentration' : key === 'move' ? 'movement'
  : key === 'nutrition' ? 'nutrition' : 'goal';

export function daySnapshot(items: DayPlanItem[]) {
  const s = summarizeDay(items);
  return {
    day_snapshot: {
      version: 1,
      complete: s.complete,
      items: s.engagements.map(x => ({
        key: x.key, category: categoryOf(x.key), label: x.label, done: x.done,
        detail: x.detail ?? null,
        source: x.measured ? 'measured' : x.declared ? 'declared' : null,
      })),
    },
    items_done: s.done.length,
    items_total: s.engagements.length,
  };
}
