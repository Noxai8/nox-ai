// ── NOX — Registre des habitudes ─────────────────────────────────────────────
// Un seul moteur générique. Chaque type est décrit ici ; aucune page dédiée par habitude.
// Les règles XP (cible figée, plafond 80/jour) sont appliquées côté serveur.

import { Cigarette, Wine, Lock, type LucideIcon } from 'lucide-react';

export type HabitKind = 'tobacco' | 'alcohol' | 'sexual_habit';
export type HabitMode = 'reduce' | 'stop' | 'track';

export type UserHabit = {
  id: string;
  kind: HabitKind;
  mode: HabitMode;
  unit: string;
  baseline: number | null;
  daily_target: number | null;
  professional_support: boolean;
  risk_flag: boolean;
  active: boolean;
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
};

export const HABIT_KINDS: HabitKind[] = ['tobacco', 'alcohol', 'sexual_habit'];

export const MODE_LABELS: Record<HabitMode, { title: string; detail: string }> = {
  reduce: { title: 'Réduire', detail: 'Tu fixes une cible quotidienne à ne pas dépasser.' },
  stop:   { title: 'Arrêter', detail: 'Cible quotidienne : zéro.' },
  track:  { title: 'Suivre seulement', detail: 'Tu notes, sans cible. Ne rapporte pas d’XP.' },
};

/** Cible tenue ? (null = pas de cible = pas d'évaluation) */
export function isTargetMet(count: number, target: number | null): boolean | null {
  if (target == null) return null;
  return count <= target;
}
