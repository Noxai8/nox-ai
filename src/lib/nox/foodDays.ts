// ── NOX — Repas regroupés par journée LOCALE ─────────────────────────────────
// Un repas enregistré à 0 h 30 appartient au nouveau jour de l'utilisateur, pas à la veille UTC.
import { localDateFromDate } from '../localDate';

export type FoodLike = { created_at: string; calories?: number | null; protein?: number | null };

export function foodTotalsByLocalDay(entries: FoodLike[]): Record<string, { kcal: number; prot: number }> {
  const byDay: Record<string, { kcal: number; prot: number }> = {};
  for (const f of entries) {
    const at = new Date(f.created_at);
    if (Number.isNaN(at.getTime())) continue;
    const day = localDateFromDate(at);
    if (!byDay[day]) byDay[day] = { kcal: 0, prot: 0 };
    byDay[day].kcal += Number(f.calories ?? 0);
    byDay[day].prot += Number(f.protein ?? 0);
  }
  return byDay;
}
