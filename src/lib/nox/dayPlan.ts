// ── NOX — « Ta journée » : engagements actifs du jour ────────────────────────
// Fonction pure : aucune donnée inventée, aucun calcul d'XP (le serveur reste seul juge).
// Chaque ligne n'apparaît que si elle s'applique à l'utilisateur (axes, habitudes, mission).

import { habitName, isTargetMet, targetLine, type UserHabit } from './habits';

export type DayPlanItem = {
  key: string;
  label: string;
  detail?: string;
  /** Valeur saisie manuellement (pas) : affichée « DÉCLARÉ » */
  declared?: boolean;
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
  todayLogs: { habit_id: string; count: number }[];
};

/** Zone nutrition : ±10 % autour de la cible (jamais un chiffre exact à atteindre) */
export const nutritionZone = (target: number) => ({ low: Math.round(target * 0.9), high: Math.round(target * 1.1) });

const fr = (n: number) => Math.round(n).toLocaleString('fr-FR');

export function buildDayPlan(i: DayPlanInput): DayPlanItem[] {
  const has = (area: string) => i.focusAreas == null || i.focusAreas.includes(area);
  const logOf = (h: UserHabit) => i.todayLogs.find(l => l.habit_id === h.id);
  const steps = i.habits.find(h => h.kind === 'steps') ?? null;
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
    items.push({
      key: 'move', label: 'Bouger',
      // Aucune valeur affichée tant que rien n'a été saisi (pas de « 0 » inventé)
      detail: log ? `${fr(log.count)} / ${fr(steps.daily_target ?? 0)} pas` : `à saisir · objectif ${fr(steps.daily_target ?? 0)} pas`,
      declared: !!log,
      done: !!log && isTargetMet(log.count, steps.daily_target, 'build') === true,
      route: `/habits/${steps.id}`,
    });
  } else if (has('movement') && !restDay) {
    items.push({
      key: 'move', label: 'Bouger',
      detail: i.session ? i.session.name : 'une séance ou une activité',
      done: i.movedToday, route: i.session ? '/program' : '/movement',
    });
  }

  // Nutrition : seulement si l'axe est actif. Information, sans effet sur l'XP.
  if (has('nutrition')) {
    if (i.caloriesTarget > 0) {
      const z = nutritionZone(i.caloriesTarget);
      items.push({
        key: 'nutrition', label: 'Nutrition',
        detail: `${fr(i.kcalToday)} kcal · zone ${fr(z.low)}–${fr(z.high)}`,
        done: i.kcalToday >= z.low && i.kcalToday <= z.high, route: '/fuel',
      });
    } else {
      items.push({
        key: 'nutrition', label: 'Nutrition',
        detail: `${i.mealsToday} repas enregistré${i.mealsToday > 1 ? 's' : ''}`,
        done: i.mealsToday >= 2, route: '/fuel',
      });
    }
  }

  // Habitudes et objectifs personnels (les pas sont déjà sous « Bouger »)
  for (const h of i.habits) {
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
