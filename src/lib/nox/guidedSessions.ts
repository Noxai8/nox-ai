// ── NOX — Séance guidée du jour (moteur Program/Training en arrière-plan) ────
// Source de vérité partagée par la Home et par Activité.
// Règle reprise À L'IDENTIQUE de la Home : la séance du jour est la première séance du programme
// dont le champ « day » contient les 3 premières lettres du jour (« dim », « lun », « mar »…).

const DAY_NAMES = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

export type ProgramLike = { program_json?: { sessions?: unknown[] } | null } | null | undefined;

/** Séances du programme actif (tableau vide si aucun programme) */
export function programSessions(program: ProgramLike): any[] {
  const sessions = program?.program_json?.sessions;
  return Array.isArray(sessions) ? sessions : [];
}

/** Séance prévue à la date donnée (par défaut aujourd'hui), ou null */
export function todaySessionFromProgram(program: ProgramLike, now: Date = new Date()): any | null {
  const prefix = DAY_NAMES[now.getDay()].toLowerCase().slice(0, 3);
  return programSessions(program).find((session: any) =>
    String(session?.day || '').toLowerCase().includes(prefix),
  ) || null;
}

/**
 * Identifiant à passer à /training/:sessionId pour démarrer cette séance :
 * même valeur que l'écran Programme (`session.id ?? index`), que Training sait résoudre.
 */
export function sessionRouteId(program: ProgramLike, session: any): string | null {
  if (!session) return null;
  const index = programSessions(program).findIndex((s: any) => s === session);
  if (index < 0) return null;
  return String(session.id ?? index);
}
