// À lancer avec le fuseau de Paris : TZ=Europe/Paris npx tsx tests/activity.test.ts
import {
  ACTIVITY_CATALOG, activitiesForDay, movementInsert, recentActivities, searchActivities, sportLabel, summarize,
  validateNewActivity, weekSummary, workoutDay, workoutMinutes,
} from '../src/lib/nox/activity';
import { localDateFromDate, todayLocalDate } from '../src/lib/localDate';
import { stepsView } from '../src/lib/nox/steps';

let ok = 0, ko = 0;
const t = (n: string, c: boolean) => { c ? ok++ : ko++; console.log(c ? '✓' : '✗', n); };
const H = (o: any) => ({ id: o.id, kind: o.kind, label: o.label ?? null, mode: 'build', unit: o.unit ?? 'pas', baseline: null,
  daily_target: o.daily_target ?? null, professional_support: false, risk_flag: false, active: true, started_on: 'x', in_day: true }) as any;
const steps = H({ id: 's', kind: 'steps', daily_target: 10000 });
const D = '2026-10-06';

// Pas : même module que la Home, aucune valeur inventée
const none = stepsView([steps], []);
t('Aucun relevé : pas de valeur (jamais 0), pas de source', none.count === null && none.sourceLabel === null && none.progress === 0);
t('Saisie manuelle → DÉCLARÉ', stepsView([steps], [{ habit_id: 's', count: 4000, source: 'manual' }]).sourceLabel === 'DÉCLARÉ');
t('Apple Santé → MESURÉ', stepsView([steps], [{ habit_id: 's', count: 4000, source: 'healthkit' }]).sourceLabel === 'MESURÉ · Apple Santé');
t('Health Connect → MESURÉ', stepsView([steps], [{ habit_id: 's', count: 4000, source: 'health_connect' }]).sourceLabel === 'MESURÉ · Health Connect');

// Activités : agrégation movement_logs + séances terminées
const movement = [
  { id: 'a', date: D, sport: 'marche', duration_min: 30, intensity: 'light', created_at: '2026-10-06T07:00:00Z' },
  { id: 'b', date: D, sport: 'padel', duration_min: 60, intensity: 'intense', created_at: '2026-10-06T17:00:00Z' },
  { id: 'c', date: '2026-10-05', sport: 'course', duration_min: 25, intensity: 'moderate', created_at: '2026-10-05T06:00:00Z' },
];
const workouts = [
  { id: 'w1', name: 'Full Body A', status: 'completed', started_at: '2026-10-06T10:00:00Z', finished_at: '2026-10-06T10:48:00Z', duration_minutes: 48 },
  { id: 'w2', name: 'Prévue', status: 'planned', started_at: null, finished_at: null, duration_minutes: null },
  { id: 'w3', name: null, status: 'completed', started_at: '2026-10-06T19:00:00Z', finished_at: '2026-10-06T19:40:00Z', duration_minutes: null },
  { id: 'w4', name: 'Nuit', status: 'completed', started_at: '2026-10-05T21:40:00Z', finished_at: '2026-10-05T22:30:00Z', duration_minutes: 50 }, // 00:30 le 06/10 à Paris
];
const day = activitiesForDay(D, movement as any, workouts as any);
t('Chaque événement reste une ligne distincte (2 saisies + 3 séances terminées)', day.length === 5);
t('Saisie manuelle → DÉCLARÉ, séance → ENREGISTRÉ', day.filter(a => a.origin === 'declared').length === 2 && day.filter(a => a.origin === 'recorded').length === 3);
t('Séance seulement prévue : ignorée', !day.some(a => a.key === 'w-w2'));
t('Activité d’un autre jour : ignorée', !day.some(a => a.key === 'm-c'));
t('Séance terminée à 00:30 (Paris) rattachée au bon jour local', workoutDay(workouts[3] as any) === '2026-10-06' && day.some(a => a.key === 'w-w4'));
t('Durée sans valeur enregistrée : calculée depuis les vrais horaires (40 min)', workoutMinutes(workouts[2] as any) === 40);
t('Durée totalement inconnue → null, jamais inventée', workoutMinutes({ id: 'x', status: 'completed', finished_at: '2026-10-06T10:00:00Z' } as any) === null);
t('Libellés : « Marche », « Padel », séance nommée', sportLabel('marche') === 'Marche' && sportLabel('padel') === 'Padel' && day.some(a => a.label === 'Musculation · Full Body A'));
t('Tri chronologique (heures réelles)', day.map(a => a.key).join(',') === 'w-w4,m-a,w-w1,m-b,w-w3');

const s = summarize(day);
t('Minutes actives = somme des durées connues (30 + 60 + 48 + 40 + 50)', s.activeMinutes === 228 && !s.partialMinutes);
t('Distance : jamais estimée (aucune source réelle)', s.distanceKm === null);
const partial = summarize([...day, { key: 'z', label: 'Yoga', minutes: null, origin: 'declared', at: null, intensity: null }]);
t('Durée inconnue sur une activité → somme marquée partielle', partial.partialMinutes && partial.activeMinutes === 228 && partial.count === 6);
t('Aucune activité → minutes « — » (null), pas 0', summarize([]).activeMinutes === null && summarize([]).count === 0);

// Aucun pas déduit des activités
const marcheSeule = stepsView([steps], []);
t('Une marche enregistrée ne crée jamais de pas', activitiesForDay(D, movement as any, []).length === 2 && marcheSeule.count === null);

// Semaine
const week = weekSummary(['2026-10-05', D], [steps], [{ habit_id: 's', date: D, count: 8200, source: 'manual' }], movement as any, workouts as any);
t('Semaine : jour sans relevé de pas → null (pas 0)', week[0].steps === null && week[0].stepsSource === null);
t('Semaine : relevé réel du jour avec sa source', week[1].steps === 8200 && week[1].stepsSource === 'DÉCLARÉ');
t('Semaine : nombre d’activités et durée par jour', week[0].activities === 1 && week[0].minutes === 25 && week[1].activities === 5 && week[1].minutes === 228);

// ── Étape 3 : ajout manuel ──
const ids = ACTIVITY_CATALOG.map(a => a.id);
t('Catalogue : les 16 activités demandées', ['marche','course','velo','football','musculation','natation','padel','tennis','basket','badminton','boxe','randonnee','yoga','etirements','danse','autre'].every(id => ids.includes(id)) && ids.length === 16);
t('Recherche « pad » → Padel', searchActivities('pad').map(a => a.id).join() === 'padel');
t('Recherche sans accent : « velo » → Vélo, « etirem » → Étirements', searchActivities('velo')[0]?.id === 'velo' && searchActivities('etirem')[0]?.id === 'etirements');
t('Recherche insensible à la casse : « BOXE »', searchActivities('BOXE')[0]?.id === 'boxe');
t('Recherche vide → toute la liste ; sans résultat → liste vide', searchActivities('').length === 16 && searchActivities('zzz').length === 0);
const rec = recentActivities([
  { id: '1', date: '2026-10-01', sport: 'course', duration_min: 20, created_at: '2026-10-01T08:00:00Z' },
  { id: '2', date: '2026-10-05', sport: 'padel', duration_min: 60, created_at: '2026-10-05T18:00:00Z' },
  { id: '3', date: '2026-10-03', sport: 'course', duration_min: 25, created_at: '2026-10-03T08:00:00Z' },
] as any);
t('Activités récentes : distinctes, de la plus récente à la plus ancienne', rec.map(r => r.id).join() === 'padel,course' && rec[0].label === 'Padel');

const TODAY = '2026-10-06', YESTERDAY = '2026-10-05';
const base = { sport: 'padel', date: TODAY, durationMin: 60, intensity: 'moderate' as const, note: '' };
t('Padel accepté', validateNewActivity(base, TODAY, YESTERDAY).length === 0);
t('Note facultative : vide → null', validateNewActivity({ ...base, note: '' }, TODAY, YESTERDAY).length === 0 && movementInsert('u', base).note === null);
t('Note conservée telle quelle (espaces retirés)', movementInsert('u', { ...base, note: '  avec des amis ' }).note === 'avec des amis');
t('Note > 280 caractères refusée', validateNewActivity({ ...base, note: 'x'.repeat(281) }, TODAY, YESTERDAY).length === 1);
t('Intensité obligatoire (schéma)', validateNewActivity({ ...base, intensity: '' }, TODAY, YESTERDAY).some(e => /intensité/.test(e)));
t('Durée obligatoire, entière, entre 1 et 600', ['', 0, 1.5, 601].every(d => validateNewActivity({ ...base, durationMin: d as any }, TODAY, YESTERDAY).length === 1) && validateNewActivity({ ...base, durationMin: '45' }, TODAY, YESTERDAY).length === 0);
t('Activité obligatoire', validateNewActivity({ ...base, sport: '' }, TODAY, YESTERDAY).length === 1);
t('Date : aujourd’hui ou hier seulement (pas de futur, pas avant-hier)', validateNewActivity({ ...base, date: YESTERDAY }, TODAY, YESTERDAY).length === 0 && validateNewActivity({ ...base, date: '2026-10-07' }, TODAY, YESTERDAY).length === 1 && validateNewActivity({ ...base, date: '2026-10-04' }, TODAY, YESTERDAY).length === 1);

const row = movementInsert('user-1', { ...base, sport: 'Padel ', durationMin: '60' });
t('Ligne movement_logs : uniquement les colonnes existantes', JSON.stringify(Object.keys(row).sort()) === JSON.stringify(['date','duration_min','intensity','note','sport','user_id']));
t('Aucune source, distance, calorie ni pas ajoutés', !['source','distance_km','calories','calories_burned','steps','count','started_at'].some(k => k in row));
t('Valeurs normalisées : sport « padel », durée numérique', row.sport === 'padel' && row.duration_min === 60 && row.intensity === 'moderate');

// Une fois enregistrée : DÉCLARÉ, reprise par le résumé, aucun pas
const saved = [{ id: 'new', ...row, created_at: '2026-10-06T12:00:00Z' }];
const items = activitiesForDay(TODAY, saved as any, []);
t('Activité enregistrée affichée comme DÉCLARÉ', items.length === 1 && items[0].origin === 'declared' && items[0].label === 'Padel');
const sum = summarize(items);
t('Résumé recalculé : 1 activité, 60 min', sum.count === 1 && sum.activeMinutes === 60);
t('Musculation saisie = activité normale (pas de séance guidée)', activitiesForDay(TODAY, [{ id: 'm', date: TODAY, sport: 'musculation', duration_min: 45, intensity: 'intense' }] as any, [])[0].label === 'Musculation');
const marche = movementInsert('u', { ...base, sport: 'marche', durationMin: 30 });
t('« Marche · 30 min » ne génère jamais de pas', !('steps' in marche) && stepsView([steps], []).count === null);

// Date locale (Paris) : à 00:30 le 06/10, « aujourd'hui » = 06/10 et « hier » = 05/10
{
  const Real = Date, ms = Real.parse('2026-10-05T22:30:00Z');
  (globalThis as any).Date = class extends Real { constructor(...a: any[]) { super(...(a.length ? a : [ms])); } static now() { return ms; } };
  const today = todayLocalDate(); const n = new Date();
  const yesterday = localDateFromDate(new Date(n.getFullYear(), n.getMonth(), n.getDate() - 1));
  (globalThis as any).Date = Real;
  t('Date locale correcte à 00:30 (Paris) : aujourd’hui 06/10, hier 05/10', today === '2026-10-06' && yesterday === '2026-10-05');
}

console.log(`\n${ok} réussis, ${ko} échoués`);
