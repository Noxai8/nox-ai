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

// ── Catalogue des activités ──
// L'identifiant est enregistré tel quel dans movement_logs.sport (texte libre : aucune migration).
// Les identifiants déjà utilisés par /movement sont conservés (ex. « basket »).
export type ActivityKind = { id: string; label: string };
export const ACTIVITY_CATALOG: ActivityKind[] = [
  { id: 'marche', label: 'Marche' },
  { id: 'course', label: 'Course' },
  { id: 'velo', label: 'Vélo' },
  { id: 'football', label: 'Football' },
  { id: 'musculation', label: 'Musculation' },
  { id: 'natation', label: 'Natation' },
  { id: 'padel', label: 'Padel' },
  { id: 'tennis', label: 'Tennis' },
  { id: 'basket', label: 'Basketball' },
  { id: 'badminton', label: 'Badminton' },
  { id: 'boxe', label: 'Boxe' },
  { id: 'randonnee', label: 'Randonnée' },
  { id: 'yoga', label: 'Yoga' },
  { id: 'etirements', label: 'Étirements' },
  { id: 'danse', label: 'Danse' },
  { id: 'autre', label: 'Autre activité' },
];
const SPORT_LABELS: Record<string, string> = Object.fromEntries(ACTIVITY_CATALOG.map(a => [a.id, a.label]));
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

// ── Ajout manuel d'une activité (movement_logs) ──────────────────────────────

/** Minuscules sans accents, pour une recherche tolérante (« velo » trouve « Vélo ») */
const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

export function searchActivities(query: string, catalog: ActivityKind[] = ACTIVITY_CATALOG): ActivityKind[] {
  const q = normalize(query);
  if (!q) return catalog;
  return catalog.filter(a => normalize(a.label).includes(q) || normalize(a.id).includes(q));
}

/** Activités récentes : sports distincts réellement enregistrés, du plus récent au plus ancien */
export function recentActivities(logs: MovementLogRow[], limit = 4): ActivityKind[] {
  const sorted = [...logs].sort((a, b) => (b.created_at ?? b.date).localeCompare(a.created_at ?? a.date));
  const seen = new Set<string>();
  const out: ActivityKind[] = [];
  for (const l of sorted) {
    const id = String(l.sport ?? '').trim().toLowerCase();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push({ id, label: sportLabel(id) });
    if (out.length >= limit) break;
  }
  return out;
}

export const INTENSITIES = ['light', 'moderate', 'intense'] as const;
export type Intensity = typeof INTENSITIES[number];
export const MAX_DURATION_MIN = 600;
export const MAX_NOTE = 280;

export type NewActivityInput = { sport: string; date: string; durationMin: number | string; intensity: Intensity | '' | null; note?: string | null };

/**
 * Validation conforme au schéma réel de movement_logs :
 * sport et intensité obligatoires, durée > 0, note ≤ 280 caractères,
 * date = aujourd'hui ou hier (la base refuse au-delà de la veille ; une activité réalisée n'est pas future).
 */
export function validateNewActivity(input: NewActivityInput, today: string, yesterday: string): string[] {
  const errors: string[] = [];
  if (!String(input.sport ?? '').trim()) errors.push('Choisis une activité.');
  if (input.date !== today && input.date !== yesterday) errors.push('La date doit être aujourd’hui ou hier.');
  const d = Number(input.durationMin);
  if (!Number.isInteger(d) || d < 1 || d > MAX_DURATION_MIN) errors.push(`Indique une durée entre 1 et ${MAX_DURATION_MIN} minutes.`);
  if (!input.intensity || !(INTENSITIES as readonly string[]).includes(input.intensity)) errors.push('Choisis une intensité.');
  if ((input.note ?? '').length > MAX_NOTE) errors.push(`La note ne doit pas dépasser ${MAX_NOTE} caractères.`);
  return errors;
}

/** Ligne exacte écrite dans movement_logs : uniquement les colonnes existantes, aucune donnée ajoutée */
export function movementInsert(userId: string, input: NewActivityInput) {
  const note = (input.note ?? '').trim();
  return {
    user_id: userId,
    date: input.date,
    sport: String(input.sport).trim().toLowerCase(),
    duration_min: Number(input.durationMin),
    intensity: input.intensity as Intensity,
    note: note ? note : null,
  };
}
