// ── NOX — Pilier Focus ───────────────────────────────────────────────────────
// La progression (minutes, validation) est toujours calculée par le serveur.
// Ce module ne fait qu'adapter la proposition de bloc à l'état du jour.

export type MissionKind = 'duration' | 'task';

export type DailyMission = {
  id: string;
  date: string;
  title: string;
  kind: MissionKind;
  target_minutes: number | null;
  done_at: string | null;
};

export type FocusSession = {
  id: string;
  mission_id: string;
  planned_minutes: number;
  started_at: string;
  ended_at: string | null;
  minutes: number | null;
  distractions: number;
};

export const BLOCKS = [25, 50, 90] as const;
export const MISSION_TARGETS = [30, 60, 90, 120, 180, 240] as const;

type PulseLike = { sleep_score: number; energy_score: number; body_score: number } | null;

/** Bloc proposé selon le Pulse : NOX module l'effort, il ne pousse pas à en faire plus */
export function suggestBlock(pulse: PulseLike, localHour: number): { minutes: 25 | 50; reason: string } {
  if (localHour >= 22) return { minutes: 25, reason: 'Il est tard. Si tu avances encore, garde ça court.' };
  if (!pulse) return { minutes: 25, reason: 'Sans ton Pulse, NOX propose un bloc court pour commencer.' };
  if (pulse.energy_score <= 2 || pulse.sleep_score <= 2) {
    return { minutes: 25, reason: 'Ton énergie est basse aujourd’hui. Un bloc de 25 min suffit.' };
  }
  if (pulse.energy_score >= 4 && pulse.sleep_score >= 4) {
    return { minutes: 50, reason: 'Énergie haute, sommeil solide : bon moment pour du travail profond.' };
  }
  return { minutes: 50, reason: 'Tes signaux sont corrects : un bloc de 50 min sur ta mission.' };
}

export const missionMinutes = (sessions: FocusSession[], missionId: string) =>
  sessions.filter(s => s.mission_id === missionId).reduce((s, x) => s + (x.minutes ?? 0), 0);

export function isMissionDone(m: DailyMission, minutesDone: number): boolean {
  return m.kind === 'task' ? !!m.done_at : minutesDone >= (m.target_minutes ?? Infinity);
}

/** Message d'erreur serveur lisible (les fonctions renvoient « NOX: … ») */
export const serverMessage = (e: any) =>
  String(e?.message ?? e ?? 'Erreur inconnue').replace(/^NOX:\s*/, '');
