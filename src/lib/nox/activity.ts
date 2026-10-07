// ── NOX — Activité (lecture seule) ───────────────────────────────────────────
// Regroupe les activités RÉELLEMENT enregistrées : movement_logs (saisies) et séances terminées.
// Règles : aucune donnée inventée (pas, distance, calories, minutes), une donnée absente reste absente,
// deux événements différents ne sont jamais fusionnés, une marche ne produit jamais de pas.

import { localDateFromDate } from '../localDate';
import { stepsView, type StepsLog } from './steps';
import type { UserHabit } from './habits';

export type MovementLogRow = {
  id: string; date: string; sport: string; duration_min: number | null;
  intensity?: string | null; note?: string | null; created_at?: string | null;
};
export type WorkoutRow = {
  id: string; name?: string | null; status?: string | null;
  started_at?: string | null; finished_at?: string | null;
  duration_minutes?: number | null; duration_min?: number | null;
};
export type DatedStepsLog = StepsLog & { date: string };

export type ActivityOrigin = 'declared' | 'recorded';
export type ActivityItem = {
  key: string;
  label: string;
  minutes: number | null;      // null = durée inconnue
  origin: ActivityOrigin;      // declared = saisie manuelle · recorded = séance enregistrée dans l'app
  at: string | null;           // horodatage connu (tri), sinon null
  intensity: string | null;
};

const SPORT_LABELS: Record<string, string> = {
  marche: 'Marche', course: 'Course', velo: 'Vélo', musculation: 'Musculation', natation: 'Natation',
  football: 'Football', tennis: 'Tennis', basket: 'Basket', yoga: 'Yoga', randonnee: 'Randonnée',
  danse: 'Danse', padel: 'Padel', autre: 'Autre activité',
};
export const ORIGIN_LABELS: Record<ActivityOrigin, string> = { declared: 'DÉCLARÉ', recorded: 'ENREGISTRÉ' };
export const INTENSITY_LABELS: Record<string, string> = { light: 'légère', moderate: 'modérée', intense: 'intense' };

export function sportLabel(sport: string | null | undefined): string {
  const s = String(sport ?? '').trim();
  if (!s) return 'Activité';
  return SPORT_LABELS[s.toLowerCase()] ?? s.charAt(0).toUpperCase() + s.slice(1);
}

const positive = (n: unknown): number | null => {
  const v = Number(n);
  return Number.isFinite(v) && v > 0 ? Math.round(v) : null;
};

/** Durée réelle d'une séance : celle enregistrée, sinon l'écart réel entre début et fin, sinon inconnue */
export function workoutMinutes(w: WorkoutRow): number | null {
  const stored = positive(w.duration_minutes) ?? positive(w.duration_min);
  if (stored != null) return stored;
  if (w.started_at && w.finished_at) {
    const ms = new Date(w.finished_at).getTime() - new Date(w.started_at).getTime();
    if (Number.isFinite(ms) && ms > 0) return positive(ms / 60000);
  }
  return null;
}

/** Jour local d'une séance terminée (null si non terminée) */
export function workoutDay(w: WorkoutRow): string | null {
  if (w.status !== 'completed' || !w.finished_at) return null;
  const d = new Date(w.finished_at);
  return Number.isNaN(d.getTime()) ? null : localDateFromDate(d);
}

/** Activités d'un jour : chaque ligne est un événement réel, jamais fusionné avec un autre */
export function activitiesForDay(date: string, movement: MovementLogRow[], workouts: WorkoutRow[]): ActivityItem[] {
  const items: ActivityItem[] = [
    ...movement.filter(m => m.date === date).map(m => ({
      key: `m-${m.id}`, label: sportLabel(m.sport), minutes: positive(m.duration_min),
      origin: 'declared' as const, at: m.created_at ?? null, intensity: m.intensity ?? null,
    })),
    ...workouts.filter(w => workoutDay(w) === date).map(w => ({
      key: `w-${w.id}`, label: w.name?.trim() ? `Musculation · ${w.name.trim()}` : 'Musculation',
      minutes: workoutMinutes(w), origin: 'recorded' as const, at: w.finished_at ?? null, intensity: null,
    })),
  ];
  return items.sort((a, b) => (a.at ?? '').localeCompare(b.at ?? ''));
}

export type DaySummary = {
  count: number;
  /** Somme des durées connues ; null si aucune durée n'est connue */
  activeMinutes: number | null;
  /** Vrai si certaines activités n'ont pas de durée connue (la somme est alors partielle) */
  partialMinutes: boolean;
  /** Aucune source de distance n'existe aujourd'hui : toujours null, jamais estimée */
  distanceKm: null;
};

export function summarize(items: ActivityItem[]): DaySummary {
  const known = items.filter(i => i.minutes != null);
  return {
    count: items.length,
    activeMinutes: known.length ? known.reduce((s, i) => s + (i.minutes as number), 0) : null,
    partialMinutes: known.length > 0 && known.length < items.length,
    distanceKm: null,
  };
}

export type WeekDay = {
  date: string;
  steps: number | null;            // relevé réel du jour, sinon null (jamais 0 inventé)
  stepsSource: string | null;      // « MESURÉ · … » ou « DÉCLARÉ »
  activities: number;
  minutes: number | null;
};

/** Semaine : uniquement des valeurs calculées à partir des données enregistrées */
export function weekSummary(
  days: string[], habits: UserHabit[], stepsLogs: DatedStepsLog[],
  movement: MovementLogRow[], workouts: WorkoutRow[],
): WeekDay[] {
  return days.map(date => {
    const v = stepsView(habits, stepsLogs.filter(l => l.date === date));
    const s = summarize(activitiesForDay(date, movement, workouts));
    return { date, steps: v.count, stepsSource: v.sourceLabel, activities: s.count, minutes: s.activeMinutes };
  });
}
