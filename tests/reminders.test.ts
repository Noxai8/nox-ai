import { processUser, SENT } from './.reminders-fn';
// Fausse base : tables en mémoire, requêtes filtrées par eq / gte / lt
function db(tables: Record<string, any[]>) {
  const q = (t: string) => { let rows = [...(tables[t] ?? [])]; const api: any = {
    select: () => api, eq: (k: string, v: any) => { rows = rows.filter(r => r[k] === v); return api; },
    gte: () => api, lt: () => api, not: () => api, order: () => api, limit: () => api,
    maybeSingle: async () => ({ data: rows[0] ?? null }), then: (res: any) => res({ data: rows }),
    insert: async (row: any) => { const dup = (tables[t] ?? []).some(r => r.kind === row.kind && r.local_date === row.local_date && r.user_id === row.user_id);
      if (dup) return { error: { message: 'unique' } }; (tables[t] ??= []).push({ ...row, sent_at: new Date().toISOString() }); return { error: null }; },
    delete: () => api }; return api; };
  return { from: q };
}
const RealDate = Date;
function at(hhmm: string) { const [h, m] = hhmm.split(':').map(Number); const t = RealDate.UTC(2026, 9, 5, h - 2, m); // 5 oct 2026, Paris = UTC+2
  (globalThis as any).Date = class extends RealDate { constructor(...a: any[]) { super(...(a.length ? a : [t])); } static now() { return t; } }; }
const prefs = (o: any = {}) => ({ user_id: 'u', enabled: true, morning: true, morning_time: '08:30', evening: true, evening_time: '21:00',
  habits_check: false, weekly: false, quiet_start: '22:30', quiet_end: '07:30', max_per_day: 3, timezone: 'Europe/Paris',
  nudge_nutrition: true, nudge_movement: true, nudge_mission: true, nudge_goals: true, min_gap_minutes: 120, ...o });
const base = () => ({ reminder_log: [] as any[], daily_closures: [] as any[], profiles: [{ id: 'u', focus_areas: ['movement','nutrition','focus'] }],
  nutrition_targets: [{ user_id: 'u', calories: 2000 }], food_entries: [] as any[], daily_pulses: [{ user_id: 'u', date: '2026-10-05', id: 'p' }],
  daily_missions: [] as any[], focus_sessions: [] as any[], user_habits: [] as any[], habit_logs: [] as any[], push_devices: [{ user_id: 'u', channel: 'web', id: 'd', endpoint: 'e', keys: {} }] });
let ok = 0, ko = 0; const t = (n: string, c: boolean) => { c ? ok++ : ko++; console.log(c ? '✓' : '✗', n); };
async function run(time: string, tables: any, p = prefs()) { SENT.length = 0; at(time); await processUser(db(tables) as any, p); return SENT[0] ?? null; }

(async () => {
  let T: any;
  // Bouger
  T = base(); T.user_habits = [{ id: 's', user_id: 'u', kind: 'steps', daily_target: 7000, in_day: true, active: true }];
  let m = await run('16:05', T); t('Pas sans relevé → demande de saisie, sans affirmation', m?.body.includes('renseigner tes pas') && !/peu bougé|pas assez|trop peu/i.test(m.body));
  T = base(); T.user_habits = [{ id: 's', user_id: 'u', kind: 'steps', daily_target: 7000, in_day: true, active: true }]; T.habit_logs = [{ user_id: 'u', habit_id: 's', date: '2026-10-05', count: 1500 }];
  m = await run('16:05', T); t('Pas déclarés très en retard → suggestion de marche', m?.title === 'Un peu de mouvement ?' && m.body.includes('marche'));
  T.habit_logs[0].count = 5000; m = await run('16:05', base()); t('Sans objectif de pas → aucun rappel Bouger', m === null);
  // Nutrition
  T = base(); m = await run('18:05', T); t('Repas insuffisamment renseignés → invitation à compléter, sans juger', m?.title === 'Ton suivi repas' && m.body.includes('Ajoute tes repas'));
  T = base(); T.food_entries = [{ user_id: 'u', calories: 400, created_at: '2026-10-05T08:00:00Z' }, { user_id: 'u', calories: 300, created_at: '2026-10-05T11:00:00Z' }];
  m = await run('18:05', T); t('2 repas, 700 / 2000 kcal → point nutrition', m?.title === 'Point nutrition');
  T = base(); T.nutrition_targets = []; m = await run('18:05', T); t('Sans cible calorique → aucun rappel Nutrition', m === null);
  T = base(); T.profiles = [{ id: 'u', focus_areas: ['movement'] }]; m = await run('18:05', T); t('Sans axe Nutrition → aucun rappel Nutrition', m === null);
  // Concentration
  T = base(); T.daily_missions = [{ id: 'm', user_id: 'u', date: '2026-10-05', title: 'Avancer sur mon projet', kind: 'duration', target_minutes: 60, done_at: null }];
  m = await run('14:05', T); t('Mission non commencée → rappel à 14 h', m?.title === 'Ta mission t’attend');
  T.focus_sessions = [{ mission_id: 'm', minutes: 25 }]; m = await run('19:05', T); t('Mission commencée non terminée → rappel à 19 h', m?.title === 'Ta mission avance' && m.body.includes('25 / 60'));
  // Objectifs : jamais de nom
  T = base(); T.user_habits = [{ id: 'a', user_id: 'u', kind: 'alcohol', in_day: true, active: true }, { id: 'c', user_id: 'u', kind: 'custom', in_day: true, active: true }];
  m = await run('18:00', { ...T, profiles: [{ id: 'u', focus_areas: [] }] }, prefs({ evening_time: '22:00' }));
  SENT.length = 0; at('18:35'); await processUser(db({ ...T, profiles: [{ id: 'u', focus_areas: [] }] }) as any, prefs({ evening_time: '22:00' })); m = SENT[0];
  t('Objectifs non notés → rappel générique sans nom', m?.title === 'Un objectif attend' && !/alcool|tabac|custom/i.test(m.title + m.body));
  T.user_habits[1].in_day = false; T.user_habits[0].in_day = false; SENT.length = 0; await processUser(db({ ...T, profiles: [{ id: 'u', focus_areas: [] }] }) as any, prefs({ evening_time: '22:00' }));
  t('Objectifs hors journée → aucun rappel', SENT.length === 0);
  // Protections
  T = base(); m = await run('23:00', T, prefs({ evening_time: '23:00' })); t('Heures calmes → rien', m === null);
  T = base(); T.reminder_log = [{ user_id: 'u', kind: 'morning', local_date: '2026-10-05', sent_at: new RealDate(RealDate.UTC(2026, 9, 5, 15, 0)).toISOString() }];
  m = await run('18:05', T); t('Moins de 2 h depuis le dernier rappel → rien', m === null);
  T = base(); T.reminder_log = [{ user_id: 'u', kind: 'nutrition', local_date: '2026-10-05', sent_at: '2026-10-05T06:00:00Z' }];
  m = await run('18:05', T); t('Même rappel déjà envoyé aujourd’hui → pas de doublon', m === null);
  T = base(); m = await run('19:05', { ...T, daily_missions: [{ id: 'm', user_id: 'u', date: '2026-10-05', title: 'X', kind: 'duration', target_minutes: 60, done_at: null }], focus_sessions: [{ mission_id: 'm', minutes: 10 }] });
  t('Clôture à 21 h : un rappel à 19 h respecte encore l’intervalle de 2 h', m?.title === 'Ta mission avance');
  T = base(); T.daily_missions = [{ id: 'm', user_id: 'u', date: '2026-10-05', title: 'X', kind: 'duration', target_minutes: 60, done_at: null }]; T.focus_sessions = [{ mission_id: 'm', minutes: 10 }];
  m = await run('19:05', T, prefs({ evening_time: '20:30' })); t('Clôture à 20 h 30 : pas de rappel à 19 h (intervalle de 2 h protégé)', m === null);
  T = base(); T.reminder_log = [{ user_id: 'u', kind: 'morning', local_date: '2026-10-05', sent_at: '2026-10-05T06:30:00Z' }];
  m = await run('16:05', { ...T, user_habits: [{ id: 's', user_id: 'u', kind: 'steps', daily_target: 7000, in_day: true, active: true }] }, prefs({ max_per_day: 2 }));
  t('Quota de 2 déjà à 1 : la place de la clôture est réservée → pas de rappel Bouger', m === null);
  T = base(); T.user_habits = [{ id: 's', user_id: 'u', kind: 'steps', daily_target: 7000, in_day: true, active: true }]; T.reminder_log = [{ user_id: 'u', kind: 'morning', local_date: '2026-10-05', sent_at: '2026-10-05T06:30:00Z' }];
  m = await run('21:05', T, prefs({ max_per_day: 2 })); t('La clôture passe dans la place réservée et liste les catégories', m?.url === '/closure' && m.body.includes('Bouger') && m.body.includes('Nutrition'));
  T = base(); T.daily_closures = [{ user_id: 'u', date: '2026-10-05', id: 'c' }]; m = await run('21:05', T); t('Journée déjà clôturée → pas de rappel de clôture', m === null);
  T = base(); m = await run('16:05', { ...T, user_habits: [{ id: 's', user_id: 'u', kind: 'steps', daily_target: 7000, in_day: true, active: true }] }, prefs({ nudge_movement: false })); t('Type désactivé → rien', m === null);
  console.log(`\n${ok} réussis, ${ko} échoués`);
})();
