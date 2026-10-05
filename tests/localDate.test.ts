// À lancer avec le fuseau de Paris : TZ=Europe/Paris npx tsx tests/localDate.test.ts
import { localDateFromDate, localDayEndISO, localDayStartISO, todayLocalDate } from '../src/lib/localDate';
import { foodTotalsByLocalDay } from '../src/lib/nox/foodDays';
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

// ── Repas regroupés par journée locale (Bilan hebdo, NOX Future) ──
const meals = [
  { created_at: '2026-10-05T21:30:00Z', calories: 600, protein: 30 },  // 23:30 le 05/10 à Paris
  { created_at: '2026-10-05T22:30:00Z', calories: 400, protein: 20 },  // 00:30 le 06/10 à Paris (UTC : 05/10)
  { created_at: '2026-10-05T23:30:00Z', calories: 100, protein: 5 },   // 01:30 le 06/10 à Paris (UTC : 05/10)
  { created_at: '2026-10-06T10:00:00Z', calories: 700, protein: 40 },  // 12:00 le 06/10
];
const g = foodTotalsByLocalDay(meals);
t('Repas de 23:30 → 05/10', g['2026-10-05']?.kcal === 600);
t('Repas de 00:30 et 01:30 → 06/10 (et non la veille UTC)', g['2026-10-06']?.kcal === 1200 && g['2026-10-06']?.prot === 65);
t('Cas piège : l’ancien regroupement UTC aurait mis 1 100 kcal le 05/10', meals.filter(m => m.created_at.slice(0, 10) === '2026-10-05').reduce((s, m) => s + m.calories, 0) === 1100);
t('Horodatage invalide ignoré', Object.keys(foodTotalsByLocalDay([{ created_at: 'n/a', calories: 10 }])).length === 0);

// ── Bornes de requête : minuit LOCAL, exprimé en instant UTC ──
t('Début du 06/10 à Paris (été) = 2026-10-05T22:00:00.000Z', localDayStartISO('2026-10-06') === '2026-10-05T22:00:00.000Z');
t('Fin du 06/10 à Paris (été) = 2026-10-06T21:59:59.999Z', localDayEndISO('2026-10-06') === '2026-10-06T21:59:59.999Z');
t('Début du 15/01 à Paris (hiver) = 2027-01-14T23:00:00.000Z', localDayStartISO('2027-01-15') === '2027-01-14T23:00:00.000Z');
const inWindow = (iso: string, a: string, b: string) => iso >= localDayStartISO(a) && iso <= localDayEndISO(b);
t('Repas de 00:30 le premier jour : désormais inclus dans la fenêtre', inWindow('2026-10-05T22:30:00.000Z', '2026-10-06', '2026-10-12'));
t('… alors que l’ancienne borne « T00:00:00 » (lue en UTC) l’excluait', !('2026-10-05T22:30:00.000Z' >= '2026-10-06T00:00:00'));
t('Repas de 00:30 le lendemain du dernier jour : exclu', !inWindow('2026-10-12T22:30:00.000Z', '2026-10-06', '2026-10-12'));

console.log(`\n${ok} réussis, ${ko} échoués`);
