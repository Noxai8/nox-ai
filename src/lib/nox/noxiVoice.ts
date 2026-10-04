// ── NOXI — la voix du compagnon ──────────────────────────────────────────────
// Chaleureuse, un peu joueuse, jamais culpabilisante. Aucun texte généré :
// une bibliothèque fixe, choisie de façon déterministe selon l'état de la journée.
// Règles : jamais de mot sur une habitude précise, jamais de pression, pas d'emoji.

export type DayState =
  | 'comeback'        // aucune clôture depuis plusieurs jours
  | 'morning_start'   // matin, Pulse pas encore fait
  | 'start'           // plus tard, rien de fait
  | 'in_progress'     // au moins un objectif accompli
  | 'almost'          // il ne reste qu'un objectif
  | 'evening_close'   // soir, tout est prêt sauf la clôture
  | 'done';           // journée complète

const LINES: Record<DayState, string[]> = {
  comeback: [
    'Ça faisait un moment. Pas de bilan, pas de reproche : on reprend juste aujourd’hui.',
    'Te revoilà. On repart de là où tu es, pas de là où tu étais.',
    'Content de te revoir. Une seule chose aujourd’hui, et c’est déjà une reprise.',
  ],
  morning_start: [
    'Ton Pulse m’attend. Promis, c’est plus rapide qu’un café.',
    'Bien dormi ? Trois petits chiffres et je m’occupe du reste.',
    'Nouvelle journée. Dis-moi comment tu arrives, je te dis ce qui compte.',
    'Avant de foncer : comment va la machine ce matin ?',
  ],
  start: [
    'Rien n’est joué. On commence par ton Pulse ?',
    'La journée n’attend que toi. Dix secondes pour démarrer.',
    'Pas de pression. Un premier pas, et on verra la suite ensemble.',
  ],
  in_progress: [
    'C’est parti. Tu avances, je note tout.',
    'Bon rythme. On garde le cap, tranquillement.',
    'Une case de cochée. Les meilleures journées commencent comme ça.',
  ],
  almost: [
    'Plus qu’une. Tu y es presque.',
    'Il reste un petit morceau, et ta journée est bouclée.',
    'Dernière ligne droite. Je t’attends à l’arrivée.',
  ],
  evening_close: [
    'On referme la journée ensemble ? Trente secondes, pas une de plus.',
    'Avant de dormir : raconte-moi ta journée en trois taps.',
    'La journée touche à sa fin. Un dernier point et c’est rangé.',
  ],
  done: [
    'Journée bouclée. Je retiens tout ça pour la suite.',
    'Tout est fait. Repose-toi, tu l’as mérité.',
    'Mission du jour accomplie. À demain, même heure, même énergie.',
  ],
};

/** Hachage simple et stable : même date + même état = même phrase toute la journée */
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function noxiLine(state: DayState, dateKey: string): string {
  const pool = LINES[state];
  return pool[hash(`${dateKey}:${state}`) % pool.length];
}

export function dayState(args: {
  done: number;
  total: number;
  pulseDone: boolean;
  closureDone: boolean;
  localHour: number;
  daysSinceLastClosure: number | null;
}): DayState {
  const { done, total, pulseDone, closureDone, localHour, daysSinceLastClosure } = args;
  if (total > 0 && done >= total) return 'done';
  if (done === 0 && daysSinceLastClosure != null && daysSinceLastClosure >= 3) return 'comeback';
  if (!pulseDone && done === 0) return localHour < 12 ? 'morning_start' : 'start';
  if (!closureDone && localHour >= 19 && done === total - 1) return 'evening_close';
  if (done === total - 1) return 'almost';
  return done > 0 ? 'in_progress' : 'start';
}
