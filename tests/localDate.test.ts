// À lancer avec le fuseau de Paris : TZ=Europe/Paris npx tsx tests/localDate.test.ts
import { localDateFromDate, todayLocalDate } from '../src/lib/localDate';
import { dayKey } from '../src/lib/noxBrain';

let ok = 0, ko = 0;
const t = (n: string, c: boolean) => { c ? ok++ : ko++; console.log(c ? '✓' : '✗', n); };
const utcDay = (d: Date) => d.toISOString().slice(0, 10);   // l'ancien calcul, pour prouver la différence
const at = (iso: string, fn: () => string) => {             // fige « maintenant » à un instant donné
  const Real = Date, ms = Real.parse(iso);
  (globalThis as any).Date = class extends Real { constructor(...a: any[]) { super(...(a.length ? a : [ms])); } static now() { return ms; } };
  try { return fn(); } finally { (globalThis as any).Date = Real; }
};

t('Fuseau de test = Europe/Paris', Intl.DateTimeFormat().resolvedOptions().timeZone === 'Europe/Paris');

// Heure d'été (UTC+2) : 6 octobre 2026
t('00:30 locale → nouveau jour (06/10)', at('2026-10-05T22:30:00Z', todayLocalDate) === '2026-10-06');
t('01:30 locale → nouveau jour (06/10)', at('2026-10-05T23:30:00Z', todayLocalDate) === '2026-10-06');
t('23:30 locale → jour courant (05/10)', at('2026-10-05T21:30:00Z', todayLocalDate) === '2026-10-05');
// Heure d'hiver (UTC+1) : 15 janvier 2027
t('Hiver, 00:30 locale → nouveau jour (15/01)', at('2027-01-14T23:30:00Z', todayLocalDate) === '2027-01-15');
t('Hiver, 23:30 locale → jour courant (14/01)', at('2027-01-14T22:30:00Z', todayLocalDate) === '2027-01-14');

// Non-régression : la date locale diffère de la date UTC
const night = new Date('2026-10-05T22:30:00Z');             // 00:30 à Paris
t('Cas piège : date UTC = 05/10, date locale = 06/10', utcDay(night) === '2026-10-05' && localDateFromDate(night) === '2026-10-06');

// Calendrier : une case construite à minuit local ne doit plus glisser à la veille
const cell = new Date(2026, 9, 6);                          // minuit local le 6 octobre
t('Case du 6/10 : l’ancien calcul donnait le 5/10', utcDay(cell) === '2026-10-05');
t('Case du 6/10 : désormais le 6/10', localDateFromDate(cell) === '2026-10-06');

// noxBrain : un repas ou une série à 0 h 30 appartient au nouveau jour
t('noxBrain : horodatage à 00:30 locale → jour local', dayKey('2026-10-05T22:30:00Z') === '2026-10-06');
t('noxBrain : horodatage à 23:30 locale → même jour', dayKey('2026-10-05T21:30:00Z') === '2026-10-05');
t('noxBrain : date invalide → vide', dayKey('pas une date') === '');

console.log(`\n${ok} réussis, ${ko} échoués`);
