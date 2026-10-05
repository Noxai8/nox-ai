// ── NOX — Registre des habitudes ─────────────────────────────────────────────
// Un seul moteur générique. Chaque type est décrit ici ; aucune page dédiée par habitude.
// Les règles XP (cible figée, plafond 80/jour) sont appliquées côté serveur.

import { Cigarette, Footprints, Lock, Sparkles, Wine, type LucideIcon } from 'lucide-react';

export type HabitKind = 'tobacco' | 'alcohol' | 'sexual_habit' | 'steps' | 'custom';
export type HabitMode = 'reduce' | 'stop' | 'track' | 'build';

export type UserHabit = {
  id: string;
  kind: HabitKind;
  label?: string | null;
  mode: HabitMode;
  unit: string;
  baseline: number | null;
  daily_target: number | null;
  professional_support: boolean;
  risk_flag: boolean;
  active: boolean;
  /** Fait partie de « Ta journée » (absent = oui) */
  in_day?: boolean;
  started_on: string;
};

export type HabitResource = { label: string; detail: string; href: string };

export type HabitDefinition = {
  kind: HabitKind;
  /** Libellé affiché dans les réglages */
  label: string;
  /** Libellé affiché sur Aujourd'hui et partout ailleurs (neutre si discret) */
  publicLabel: string;
  unit: string;
  icon: LucideIcon;
  /** Donnée particulièrement sensible : libellé neutre + consentement explicite */
  discreet: boolean;
  /** Repérage d'une consommation à risque avant de proposer une cible */
  needsRiskCheck: boolean;
  question: string;
  resources: HabitResource[];
};

export const HABITS: Record<HabitKind, HabitDefinition> = {
  tobacco: {
    kind: 'tobacco',
    label: 'Tabac',
    publicLabel: 'Tabac',
    unit: 'cigarettes',
    icon: Cigarette,
    discreet: false,
    needsRiskCheck: false,
    question: 'Combien de cigarettes aujourd’hui ?',
    resources: [
      { label: 'Tabac Info Service', detail: '39 89 · gratuit', href: 'tel:3989' },
    ],
  },
  alcohol: {
    kind: 'alcohol',
    label: 'Alcool',
    publicLabel: 'Alcool',
    unit: 'verres',
    icon: Wine,
    discreet: false,
    needsRiskCheck: true,
    question: 'Combien de verres aujourd’hui ?',
    resources: [
      { label: 'Alcool Info Service', detail: '0 980 980 930 · gratuit', href: 'tel:0980980930' },
    ],
  },
  sexual_habit: {
    kind: 'sexual_habit',
    label: 'Habitude sexuelle (masturbation / pornographie)',
    publicLabel: 'Habitude personnelle',
    unit: 'fois',
    icon: Lock,
    discreet: true,
    needsRiskCheck: false,
    question: 'Combien de fois aujourd’hui ?',
    resources: [],
  },
  steps: {
    kind: 'steps',
    label: 'Pas quotidiens',
    publicLabel: 'Bouger',
    unit: 'pas',
    icon: Footprints,
    discreet: false,
    needsRiskCheck: false,
    question: 'Combien de pas aujourd’hui ?',
    resources: [],
  },
  custom: {
    kind: 'custom',
    label: 'Objectif personnel',
    publicLabel: 'Objectif personnel',
    unit: 'min',
    icon: Sparkles,
    discreet: false,
    needsRiskCheck: false,
    question: 'Où en es-tu aujourd’hui ?',
    resources: [],
  },
};

/** Habitudes à réduire ou arrêter (une seule active par type) */
export const HABIT_KINDS: HabitKind[] = ['tobacco', 'alcohol', 'sexual_habit'];

/** Unités proposées pour un objectif personnel */
export const CUSTOM_UNITS = ['min', 'pages', 'L', 'verres', 'km', 'fois'] as const;

/** Nom affiché : libellé choisi pour un objectif personnel, sinon le libellé public du type */
export function habitName(h: Pick<UserHabit, 'kind' | 'label'>): string {
  if (h.kind === 'custom' && h.label) return h.label;
  return HABITS[h.kind].publicLabel;
}

/** Les pas restent déclarés tant que l'app n'a pas de source mesurée (Apple Santé / Health Connect) */
export const isDeclaredSteps = (h: Pick<UserHabit, 'kind'>) => h.kind === 'steps';

/** Objectif de pas : type « steps », ou objectif personnel créé avec l'unité « pas » (même donnée, une seule représentation) */
export const isStepsHabit = (h: Pick<UserHabit, 'kind' | 'unit'>) =>
  h.kind === 'steps' || (h.kind === 'custom' && String(h.unit ?? '').trim().toLowerCase() === 'pas');

/** Saisie directe d'une valeur pour les objectifs quantitatifs (pas, minutes, pages…) plutôt que +1 / −1 */
export const usesValueInput = (h: Pick<UserHabit, 'kind' | 'mode'>) =>
  h.kind === 'steps' || h.kind === 'custom' || h.mode === 'build';

/** Origine d'un relevé : saisie dans l'app, ou mesure par une source native (à venir) */
export type LogSource = 'manual' | 'healthkit' | 'health_connect';
export const isMeasured = (source: string | null | undefined) => source === 'healthkit' || source === 'health_connect';

/** Champs à lire pour une habitude */
export const HABIT_COLUMNS = 'id, kind, label, mode, unit, baseline, daily_target, professional_support, risk_flag, active, started_on, in_day';

export const MODE_LABELS: Record<HabitMode, { title: string; detail: string }> = {
  reduce: { title: 'Réduire', detail: 'Tu fixes une cible quotidienne à ne pas dépasser.' },
  stop:   { title: 'Arrêter', detail: 'Cible quotidienne : zéro.' },
  track:  { title: 'Suivre seulement', detail: 'Tu notes, sans cible. Ne rapporte pas d’XP.' },
  build:  { title: 'Au moins', detail: 'Un objectif à atteindre chaque jour.' },
};

/** Cible tenue ? (null = pas de cible = pas d'évaluation) */
export function isTargetMet(count: number, target: number | null, mode: HabitMode = 'reduce'): boolean | null {
  if (target == null) return null;
  return mode === 'build' ? count >= target : count <= target;
}

/** Ligne factuelle du jour, sans jugement */
export function targetLine(count: number, target: number | null, mode: HabitMode, unit: string): string {
  const n = (x: number) => x.toLocaleString('fr-FR');
  if (target == null) return `${n(count)} ${unit}`;
  const met = isTargetMet(count, target, mode);
  return mode === 'build'
    ? `${n(count)} / ${n(target)} ${unit}${met ? ' ✓' : ''}`
    : `${n(count)} ${unit} · cible ≤ ${n(target)} ${unit}${met ? ' ✓' : ''}`;
}
