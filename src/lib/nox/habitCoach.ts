// ── NOX — Coaching et preuves des habitudes ─────────────────────────────────
// Règles :
//  · Pendant la journée, un objectif tenu est PROVISOIRE (« 0 cigarette jusqu'ici »).
//  · Il ne devient une PREUVE ACQUISE qu'après une vraie clôture de la journée.
//  · Un écart n'efface jamais les preuves passées. Aucune culpabilisation, aucun diagnostic.
//  · « Écart important » = au-delà de la référence PERSONNELLE (cible / valeur de départ),
//    jamais un seuil médical.
//  · Habitude personnelle : détectée par son type (sexual_habit), jamais par un mot du libellé.

import type { UserHabit } from './habits';

export type CoachMessage = { title: string; body: string; tone: 'positive' | 'neutral' | 'firm' };

export function habitFlags(h: Pick<UserHabit, 'kind' | 'mode'> | null) {
  const isTobacco = h?.kind === 'tobacco';
  const isAlcohol = h?.kind === 'alcohol';
  const isPersonal = h?.kind === 'sexual_habit';
  const sensitive = isTobacco || isAlcohol || isPersonal;
  return {
    isTobacco, isAlcohol, isPersonal,
    /** Comportement à réduire ou arrêter (tabac, alcool, habitude personnelle) */
    isQuitBehavior: sensitive && (h?.mode === 'stop' || h?.mode === 'reduce'),
    isStopTobacco: isTobacco && h?.mode === 'stop',
  };
}

/** Une journée compte comme preuve seulement si elle est clôturée ET réussie */
export function isProof(date: string, ok: boolean, closedDates: Set<string>): boolean {
  return ok && closedDates.has(date);
}

/** Écart important par rapport à la référence personnelle (pas un seuil médical) */
export function isHeavyOver(h: Pick<UserHabit, 'daily_target' | 'baseline'>, count: number): boolean {
  const reference = h.daily_target ?? h.baseline ?? null;
  if (reference == null) return false;
  if (reference === 0) return count >= Math.max(3, (h.baseline ?? 0) * 1.5);
  return count >= reference * 1.5;
}

/** Libellé d'état du jour, sans jamais anticiper la clôture */
export function habitStatusLabel(h: UserHabit, count: number | null, ok: boolean, closed: boolean, fallback: string): string {
  const f = habitFlags(h);
  if (count == null) return 'Pas encore noté aujourd’hui';
  if (f.isStopTobacco && count === 0) return closed ? 'Journée sans cigarette ✓' : '0 cigarette jusqu’ici ✓';
  if (ok) return closed ? 'Objectif accompli ✓' : 'Objectif tenu jusqu’ici ✓';
  return f.isQuitBehavior ? 'Ce n’est pas terminé.' : fallback;
}

export function habitCoach(h: UserHabit, count: number | null, ok: boolean, closed: boolean): CoachMessage {
  const f = habitFlags(h);

  // Suivi seulement : pas de cible, donc aucun objectif à « tenir » ni à « rater »
  if (h.mode === 'track') {
    return f.isAlcohol
      ? { title: count == null ? 'Note ta consommation du jour.' : 'Consommation notée.', tone: 'neutral',
          body: 'Tu suis ta consommation. Si tu bois beaucoup ou régulièrement, ne tente pas d’arrêt brutal sans avis médical : un sevrage peut nécessiter un accompagnement.' }
      : { title: count == null ? 'Note ton avancée.' : 'C’est noté.', tone: 'neutral',
          body: 'Suivre régulièrement t’aide à voir où tu en es, sans jugement.' };
  }

  if (count == null) return {
    title: 'La prochaine action compte.', tone: 'neutral',
    body: f.isQuitBehavior
      ? 'Note ton avancée. Chaque fois que tu choisis de ne pas reprendre ce comportement, tu renforces la direction que tu as choisie.'
      : 'Renseigne ton avancée pour que NOX puisse te montrer concrètement ce que tu accomplis.',
  };

  if (ok) {
    if (!closed) return {
      title: 'Tu es en bonne voie.', tone: 'positive',
      body: f.isTobacco && count === 0
        ? '0 cigarette jusqu’ici. Continue : cette réussite deviendra une preuve quand tu clôtureras ta journée.'
        : f.isQuitBehavior && count === 0
          ? 'Objectif tenu jusqu’ici. Continue : cette réussite deviendra une preuve quand tu clôtureras ta journée.'
          : 'Tu tiens ton objectif jusqu’ici. Continue jusqu’à la clôture de ta journée.',
    };
    return {
      title: 'Tu viens de prouver que c’est possible.', tone: 'positive',
      body: f.isTobacco && count === 0
        ? 'Journée sans cigarette clôturée. Cette réussite est maintenant une preuve acquise.'
        : 'Tu as tenu ton engagement jusqu’à la clôture. Cette réussite est maintenant une preuve acquise.',
    };
  }

  if (f.isQuitBehavior && isHeavyOver(h, count)) {
    if (f.isAlcohol) return {
      title: 'Tu es nettement au-dessus de ta direction aujourd’hui.', tone: 'firm',
      body: 'Ne banalise pas ce dépassement. Évite d’ajouter de l’alcool maintenant et privilégie ta sécurité. Si tu bois beaucoup ou régulièrement, ne tente pas un arrêt brutal sans avis médical : un sevrage peut nécessiter un accompagnement.',
    };
    if (f.isPersonal) return {
      title: 'Interromps la séquence maintenant.', tone: 'firm',
      body: 'Tu es nettement au-dessus de la limite que tu t’étais fixée. Coupe le déclencheur, change d’environnement et concentre-toi uniquement sur la prochaine décision. Cet écart n’efface pas tes réussites précédentes.',
    };
    return {
      title: 'Arrête la séquence maintenant.', tone: 'firm',
      body: 'Tu es nettement au-dessus de l’objectif que tu t’es fixé. Fumer est nocif : évite la prochaine cigarette, éloigne-toi du déclencheur et utilise les ressources d’aide si tu en as besoin. Tes réussites précédentes restent acquises.',
    };
  }

  return {
    title: f.isQuitBehavior ? 'La journée continue.' : 'Ce n’est pas terminé.', tone: 'neutral',
    body: f.isTobacco
      ? 'Cet écart ne décide pas de la suite. La prochaine cigarette évitée compte : reprends ta direction maintenant.'
      : f.isAlcohol
        ? 'Cet écart ne décide pas de la suite. Évite d’ajouter une consommation et reprends ta direction à la prochaine décision.'
        : f.isPersonal
          ? 'Cet écart ne décide pas de la suite. Coupe le déclencheur et reprends ta direction à la prochaine décision, sans te juger.'
          : h.mode === 'build' && h.daily_target != null
            ? `Il te reste ${Math.max(0, h.daily_target - count).toLocaleString('fr-FR')} ${h.unit} pour atteindre ton objectif aujourd’hui.`
            : 'Ton objectif reste accessible. La prochaine décision peut encore te rapprocher de la cible aujourd’hui.',
  };
}
