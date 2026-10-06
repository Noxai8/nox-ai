import { readFileSync } from 'node:fs';
import { habitCoach, habitFlags, habitStatusLabel, isHeavyOver, isProof } from '../src/lib/nox/habitCoach';
import { habitName } from '../src/lib/nox/habits';

let ok = 0, ko = 0;
const t = (n: string, c: boolean) => { c ? ok++ : ko++; console.log(c ? '✓' : '✗', n); };
const H = (o: any) => ({ id: 'h', kind: o.kind, label: o.label ?? null, mode: o.mode, unit: o.unit ?? 'fois', baseline: o.baseline ?? null,
  daily_target: o.daily_target ?? null, professional_support: false, risk_flag: !!o.risk_flag, active: true, started_on: 'x' }) as any;
const tobaccoStop = H({ kind: 'tobacco', mode: 'stop', unit: 'cigarettes', daily_target: 0, baseline: 12 });
const alcoholStop = H({ kind: 'alcohol', mode: 'stop', unit: 'verres', daily_target: 0, baseline: 4 });
const alcoholTrack = H({ kind: 'alcohol', mode: 'track', unit: 'verres', risk_flag: true });
const personal = H({ kind: 'sexual_habit', mode: 'stop', daily_target: 0, baseline: 2 });
const blame = /honte|faible|nul\b|échec|déçu|pathétique|tu aurais dû/i;
const medical = /\bOMS\b|seuil (médical|de danger)|diagnostic|addiction sévère|dépendance (grave|sévère)/i;
const all: string[] = [];
const coach = (h: any, n: number | null, okv: boolean, closed: boolean) => { const m = habitCoach(h, n, okv, closed); all.push(m.title + ' ' + m.body); return m; };

// Tabac : provisoire puis preuve acquise
const day = coach(tobaccoStop, 0, true, false);
t('Tabac 0 en journée : « 0 cigarette jusqu’ici », pas de preuve acquise', day.body.startsWith('0 cigarette jusqu’ici') && !/acquise|Journée sans cigarette/.test(day.body));
t('Libellé en journée : 0 cigarette jusqu’ici ✓', habitStatusLabel(tobaccoStop, 0, true, false, '') === '0 cigarette jusqu’ici ✓');
const closedMsg = coach(tobaccoStop, 0, true, true);
t('Après clôture : preuve acquise', /preuve acquise/.test(closedMsg.body));
t('Libellé après clôture : Journée sans cigarette ✓', habitStatusLabel(tobaccoStop, 0, true, true, '') === 'Journée sans cigarette ✓');
t('Autre objectif tenu en journée : « jusqu’ici »', habitStatusLabel(H({ kind: 'custom', mode: 'reduce', daily_target: 5 }), 3, true, false, '') === 'Objectif tenu jusqu’ici ✓');

// Preuves : seulement les jours clôturés ET réussis ; un écart n'efface rien
const closed = new Set(['2026-10-01', '2026-10-02', '2026-10-04']);
const logs = [{ d: '2026-10-01', ok: true }, { d: '2026-10-02', ok: true }, { d: '2026-10-03', ok: true }, { d: '2026-10-04', ok: false }];
const proofs = logs.filter(l => isProof(l.d, l.ok, closed)).map(l => l.d);
t('Jour réussi mais non clôturé : pas une preuve', !proofs.includes('2026-10-03'));
t('Jours clôturés et réussis : 2 preuves', proofs.length === 2);
t('Un écart le 04/10 n’efface pas les preuves des 01 et 02', proofs.includes('2026-10-01') && proofs.includes('2026-10-02'));

// Écarts
const smallOver = coach(tobaccoStop, 2, false, false);
t('Petit écart tabac : reprise immédiate, ton calme', smallOver.tone === 'neutral' && /prochaine cigarette évitée/.test(smallOver.body));
const bigOver = coach(tobaccoStop, 20, false, false);
t('Gros écart tabac : ton plus ferme, nocivité, ressources, preuves conservées', bigOver.tone === 'firm' && /nocif/.test(bigOver.body) && /ressources/.test(bigOver.body) && /restent acquises/.test(bigOver.body));
t('Écart important = référence personnelle (cible 5 → 8 oui, 7 non)', isHeavyOver({ daily_target: 5, baseline: null } as any, 8) && !isHeavyOver({ daily_target: 5, baseline: null } as any, 7));
t('Sans référence personnelle : jamais « écart important »', !isHeavyOver({ daily_target: null, baseline: null } as any, 50));

// Alcool
const aBig = coach(alcoholStop, 9, false, false);
t('Alcool, gros écart : pas d’arrêt brutal sans avis médical, accompagnement', aBig.tone === 'firm' && /ne tente pas un arrêt brutal sans avis médical/.test(aBig.body) && /accompagnement/.test(aBig.body));
const aTrack = coach(alcoholTrack, 3, false, false);
t('Alcool en suivi seulement : aucun « objectif », message de sécurité', !/objectif/i.test(aTrack.title + aTrack.body) && /accompagnement/.test(aTrack.body));
t('Alcool : aucun conseil d’arrêter du jour au lendemain', all.every(s => !/arrête (tout )?(immédiatement|d’un coup)|du jour au lendemain/i.test(s)));

// Habitude personnelle : détection par le type, discrétion
t('Habitude personnelle détectée par son type', habitFlags(personal).isPersonal);
t('Un objectif libre nommé « Pornographie » n’est PAS détecté par son libellé', !habitFlags(H({ kind: 'custom', label: 'Pornographie', mode: 'stop' })).isPersonal);
const pBig = coach(personal, 6, false, false);
t('Gros écart : couper le déclencheur, changer de contexte, reprendre la direction', pBig.tone === 'firm' && /Coupe le déclencheur/.test(pBig.body) && /change d’environnement/.test(pBig.body));
t('Libellé discret : « Habitude personnelle »', habitName(personal) === 'Habitude personnelle');
t('Aucun message ne nomme la pornographie ou la masturbation', all.every(s => !/porn|masturb/i.test(s)));

// Ton
coach(personal, 1, false, false); coach(alcoholStop, 1, false, false); coach(tobaccoStop, null, false, false);
t('Aucune culpabilisation dans les messages', all.every(s => !blame.test(s)));
t('Aucun seuil ni diagnostic médical', all.every(s => !medical.test(s)));

// Clôture restaurée (contrôle du code)
const closure = readFileSync(new URL('../src/pages/Closure.tsx', import.meta.url), 'utf8');
t('Closure.tsx exporte bien l’écran de clôture', /export default function Closure\(\)/.test(closure) && !/function HabitDetail/.test(closure));
t('Clôture : écriture dans daily_closures avec le snapshot', /from\('daily_closures'\)\.upsert\(/.test(closure) && /daySnapshot\(plan\)/.test(closure));
t('Clôture possible même incomplète : seule l’auto-évaluation est requise', /const canSave = completion !== null;/.test(closure));
t('Clôture : bilan Validé / Reste à faire', /VALIDÉ/.test(closure) && /RESTE À FAIRE/.test(closure));
t('Clôture : aucune attribution d’XP côté app', !/\bxp\b|xp_transactions|get_nox_progress/i.test(closure));
const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
t('Route /closure branchée sur pages/Closure', /import\('\.\/pages\/Closure'\)/.test(app) && /path="\/closure"/.test(app));

console.log(`\n${ok} réussis, ${ko} échoués`);
