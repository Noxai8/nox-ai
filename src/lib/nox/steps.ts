// ── NOX — Pas du jour : une seule source de vérité ─────────────────────────
// Utilisé par la carte des pas (Aujourd'hui) ET par la ligne « Bouger » de « Ta journée ».
// Aucune valeur, aucune cible, aucune source n'est inventée.

import { isStepsHabit, type UserHabit } from './habits';

export type StepsLog = { habit_id: string; count: number; source?: string | null };

export type StepsView = {
  habit: UserHabit | null;      // objectif de pas réel (null = non configuré)
  target: number | null;        // cible réelle (null = non définie)
  count: number | null;         // relevé du jour (null = aucun relevé : jamais 0)
  progress: number;             // min(count / target, 1) ; 0 sans relevé ou sans cible
  percent: number;              // progression arrondie en %
  done: boolean;                // count ≥ target
  measured: boolean;            // source native (Apple Santé / Health Connect)
  sourceLabel: string | null;   // « MESURÉ · Apple Santé », « MESURÉ · Health Connect », « DÉCLARÉ »
};

const SOURCE_LABELS: Record<string, string> = {
  healthkit: 'MESURÉ · Apple Santé',
  health_connect: 'MESURÉ · Health Connect',
  manual: 'DÉCLARÉ',
};

export function stepsView(habits: UserHabit[], todayLogs: StepsLog[]): StepsView {
  const habit = habits.find(h => h.active !== false && isStepsHabit(h)) ?? null;
  const rawTarget = habit?.daily_target;
  const target = rawTarget != null && Number.isFinite(Number(rawTarget)) && Number(rawTarget) > 0 ? Number(rawTarget) : null;
  const log = habit ? todayLogs.find(l => l.habit_id === habit.id) : undefined;
  const count = log ? Number(log.count) : null;
  const progress = count != null && target != null ? Math.min(1, count / target) : 0;
  const source = log ? (log.source ?? 'manual') : null;
  return {
    habit, target, count, progress,
    percent: Math.round(progress * 100),
    done: count != null && target != null && count >= target,
    measured: source === 'healthkit' || source === 'health_connect',
    sourceLabel: source ? (SOURCE_LABELS[source] ?? null) : null,
  };
}

const fr = (n: number) => Math.round(n).toLocaleString('fr-FR');

/** Ligne « Bouger » de « Ta journée » */
export function stepsLine(v: StepsView): string {
  if (v.count == null) return 'Connecter le suivi des pas';
  if (v.target == null) return `${fr(v.count)} pas`;
  return v.done ? `Objectif atteint · ${fr(v.count)} / ${fr(v.target)} pas` : `${fr(v.count)} / ${fr(v.target)} pas`;
}
