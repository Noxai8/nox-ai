import { buildDayPlan, daySnapshot, nutritionZone, summarizeDay } from '../src/lib/nox/dayPlan';
import { isStepsHabit, isTargetMet, usesValueInput, targetLine } from '../src/lib/nox/habits';

let ok = 0, ko = 0;
const t = (name: string, cond: boolean) => { cond ? ok++ : ko++; console.log(cond ? '✓' : '✗', name); };
const H = (o: any) => ({ id: o.id, kind: o.kind, label: o.label ?? null, mode: o.mode, unit: o.unit, baseline: null,
  daily_target: o.daily_target, professional_support: false, risk_flag: false, active: true, started_on: '2026-10-01' });
const steps = H({ id: 's', kind: 'steps', mode: 'build', unit: 'pas', daily_target: 7000 });
const read = H({ id: 'r', kind: 'custom', label: 'Lire', mode: 'build', unit: 'min', daily_target: 20 });
const water = H({ id: 'w', kind: 'custom', label: 'Boire de l’eau', mode: 'build', unit: 'L', daily_target: 2 });
const tobacco = H({ id: 't', kind: 'tobacco', mode: 'reduce', unit: 'cigarettes', daily_target: 5 });
const base: any = { focusAreas: ['movement', 'nutrition', 'focus'], pulseDone: true, closureDone: false, priorityType: 'none',
  mission: { title: 'Avancer sur mon projet', kind: 'duration', target_minutes: 60, minutes: 25, done: false },
  session: null, movedToday: false, caloriesTarget: 2000, kcalToday: 0, mealsToday: 0,
  habits: [steps, read, water, tobacco], todayLogs: [] };
const plan = (o: any = {}) => buildDayPlan({ ...base, ...o });
const item = (p: any[], k: string) => p.find(x => x.key === k);

// Pilotage : Pulse, Concentration, Clôture toujours présents
const p0 = plan();
t('Pulse présent', !!item(p0, 'pulse'));
t('Concentration présente', !!item(p0, 'mission'));
t('Clôture présente, en dernier', p0[p0.length - 1].key === 'closure');
t('Clôture accessible même si rien n’est fait', item(p0, 'closure').closure === true);

// Plusieurs objectifs personnels
t('Deux objectifs personnels distincts affichés', !!item(p0, 'r') && !!item(p0, 'w'));

// Pas sous « Bouger », DÉCLARÉ, aucune donnée fictive
const mv0 = item(p0, 'move');
t('Pas affichés sous « Bouger »', mv0.label === 'Bouger' && mv0.route === '/habits/s');
t('Sans saisie : aucun chiffre inventé (pas de « 0 »)', !/\b0 \//.test(mv0.detail) && mv0.detail === 'Connecter le suivi des pas');
t('Sans saisie : pas marqué DÉCLARÉ', !mv0.declared);
t('Les pas ne sont pas dupliqués dans les habitudes', !item(p0, 's'));
const mv1 = item(plan({ todayLogs: [{ habit_id: 's', count: 6999 }] }), 'move');
t('6 999 / 7 000 : non atteint, DÉCLARÉ', !mv1.done && mv1.declared);
t('7 000 / 7 000 : atteint (≥ cible)', item(plan({ todayLogs: [{ habit_id: 's', count: 7000 }] }), 'move').done);
t('8 500 / 7 000 : atteint', item(plan({ todayLogs: [{ habit_id: 's', count: 8500 }] }), 'move').done);
t('Pas affichés même sans l’axe Mouvement', item(plan({ focusAreas: ['focus'] }), 'move')?.label === 'Bouger');
t('Jour de récupération : rien n’est demandé', !item(plan({ priorityType: 'recovery' }), 'move'));

// Nutrition : axe + zone ±10 %
t('Nutrition absente sans l’axe Nutrition', !item(plan({ focusAreas: ['movement', 'focus'] }), 'nutrition'));
const z = nutritionZone(2000);
t('Zone ±10 % : 1 800 – 2 200', z.low === 1800 && z.high === 2200);
t('1 799 kcal : hors zone', !item(plan({ kcalToday: 1799 }), 'nutrition').done);
t('1 800 kcal : dans la zone', item(plan({ kcalToday: 1800 }), 'nutrition').done);
t('2 000 kcal : dans la zone', item(plan({ kcalToday: 2000 }), 'nutrition').done);
t('2 200 kcal : dans la zone', item(plan({ kcalToday: 2200 }), 'nutrition').done);
t('2 400 kcal : hors zone (pas validé parce qu’on a « dépassé »)', !item(plan({ kcalToday: 2400 }), 'nutrition').done);

// Objectifs « au moins » et habitudes à réduire
t('Objectif « au moins » : ≥ cible', isTargetMet(20, 20, 'build') === true && isTargetMet(19, 20, 'build') === false);
t('Habitude à réduire : ≤ cible', isTargetMet(5, 5, 'reduce') === true && isTargetMet(6, 5, 'reduce') === false);
t('Saisie de valeur pour pas et minutes', usesValueInput(steps) && usesValueInput(read));
t('Pas de saisie de valeur pour le tabac (+1 adapté)', !usesValueInput(tobacco));
t('Ligne factuelle « au moins »', targetLine(25, 20, 'build', 'min') === '25 / 20 min ✓');

// ── Lot 2 ──
t('Nutrition absente sans vraie cible calorique (même avec des repas)', !item(plan({ caloriesTarget: 0, mealsToday: 3, kcalToday: 1500 }), 'nutrition'));
t('Objectif hors journée (in_day = false) exclu du pilotage', !item(plan({ habits: [steps, { ...read, in_day: false }, water, tobacco] }), 'r'));
t('Pas hors journée : plus de ligne Bouger issue des pas', item(plan({ habits: [{ ...steps, in_day: false }] }), 'move')?.route !== '/habits/s');
t('Objectif inactif exclu', !item(plan({ habits: [{ ...water, active: false }] }), 'w'));
const meas = item(plan({ todayLogs: [{ habit_id: 's', count: 9000, source: 'healthkit' }] }), 'move');
t('Relevé natif : MESURÉ, jamais DÉCLARÉ', meas.measured === true && !meas.declared);
const man = item(plan({ todayLogs: [{ habit_id: 's', count: 9000, source: 'manual' }] }), 'move');
t('Relevé manuel : DÉCLARÉ, jamais MESURÉ', man.declared === true && !man.measured);
const screens = H({ id: 'e', kind: 'custom', label: 'Écrans', mode: 'reduce', unit: 'min', daily_target: 120 });
t('Objectif personnel « au plus » : 90 / 120 min validé', item(plan({ habits: [screens], todayLogs: [{ habit_id: 'e', count: 90 }] }), 'e').done);
t('Objectif personnel « au plus » : 150 / 120 min non validé', !item(plan({ habits: [screens], todayLogs: [{ habit_id: 'e', count: 150 }] }), 'e').done);
// Pulse + Concentration + Clôture ne suffisent pas à une journée complète
const p3 = plan({ mission: { ...base.mission, done: true }, closureDone: true });
const s3 = summarizeDay(p3);
t('Pulse + Concentration + Clôture faits, le reste non → journée NON complète', !s3.complete && s3.missing.length > 0);
t('La clôture n’est pas comptée comme un engagement', !s3.engagements.some(x => x.key === 'closure'));
const pAll = plan({ habits: [steps], kcalToday: 2000, mission: { ...base.mission, done: true }, todayLogs: [{ habit_id: 's', count: 8000 }] });
t('Tous les engagements validés → journée complète', summarizeDay(pAll).complete);
const snap = daySnapshot(plan({ todayLogs: [{ habit_id: 's', count: 8000 }] }));
t('Snapshot structuré : catégorie, état et source de chaque engagement',
  snap.day_snapshot.version === 1 && snap.day_snapshot.items.some((x: any) => x.category === 'movement' && x.done && x.source === 'declared')
  && snap.day_snapshot.items.some((x: any) => x.category === 'nutrition' && !x.done));
t('Snapshot : compteurs cohérents, sans la clôture', snap.items_total === snap.day_snapshot.items.length && snap.items_done <= snap.items_total);
t('Snapshot sans aucun champ d’XP', !JSON.stringify(snap).toLowerCase().includes('xp'));

// ── Objectif de pas créé comme objectif personnel (unité « pas ») ──
const customSteps = H({ id: 'cs', kind: 'custom', label: 'Marcher', mode: 'build', unit: 'pas', daily_target: 10000 });
t('Objectif personnel en « pas » reconnu comme objectif de pas', isStepsHabit(customSteps) && !isStepsHabit(read));
const pc = plan({ habits: [customSteps, read], todayLogs: [{ habit_id: 'cs', count: 6420, source: 'manual' }] });
t('Il alimente « Bouger » : 6 420 / 10 000 pas, DÉCLARÉ', item(pc, 'move')?.detail.replace(/[\u202f\u00a0]/g, ' ') === '6 420 / 10 000 pas' && item(pc, 'move')?.declared === true);
t('Il n’est pas rendu une deuxième fois comme objectif', !item(pc, 'cs'));
t('Progression = min(pas / cible, 1)', Math.abs(item(pc, 'move').progress - 0.642) < 1e-9);
t('Atteint seulement à ≥ cible', !item(pc, 'move').done && item(plan({ habits: [customSteps], todayLogs: [{ habit_id: 'cs', count: 10000 }] }), 'move').done);
const noTarget = H({ id: 'nt', kind: 'steps', mode: 'build', unit: 'pas', daily_target: null });
const pn = item(plan({ habits: [noTarget] }), 'move');
t('Sans cible configurée : aucune cible inventée, pas de barre', pn.detail === 'Connecter le suivi des pas' && pn.progress === undefined && !pn.done);
t('Sans relevé : jamais « 0 pas »', !/(^|\s)0 pas/.test(item(plan({ habits: [customSteps] }), 'move').detail));
t('Clôture toujours présente même journée incomplète', item(plan({ habits: [customSteps] }), 'closure')?.closure === true);

console.log(`\n${ok} réussis, ${ko} échoués`);
