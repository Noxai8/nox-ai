import { stepsLine, stepsView } from '../src/lib/nox/steps';
import { buildDayPlan } from '../src/lib/nox/dayPlan';

let ok = 0, ko = 0;
const t = (n: string, c: boolean) => { c ? ok++ : ko++; console.log(c ? '✓' : '✗', n); };
const sp = (s: string) => s.replace(/[\u202f\u00a0]/g, ' ');
const H = (o: any) => ({ id: o.id, kind: o.kind, label: o.label ?? null, mode: 'build', unit: o.unit ?? 'pas', baseline: null,
  daily_target: o.daily_target, professional_support: false, risk_flag: false, active: o.active ?? true, started_on: 'x', in_day: o.in_day });
const steps = H({ id: 's', kind: 'steps', daily_target: 10000 });
const customSteps = H({ id: 'c', kind: 'custom', label: 'Marcher', unit: 'pas', daily_target: 10000 });

// Valeurs et progression
const v1 = stepsView([steps], [{ habit_id: 's', count: 6420, source: 'manual' }]);
t('6 420 / 10 000 → 64 %', v1.percent === 64 && Math.abs(v1.progress - 0.642) < 1e-9 && !v1.done);
t('Ligne « Bouger » : 6 420 / 10 000 pas', sp(stepsLine(v1)) === '6 420 / 10 000 pas');
const v2 = stepsView([steps], [{ habit_id: 's', count: 10324, source: 'healthkit' }]);
t('10 324 / 10 000 → atteint, progression plafonnée à 100 %', v2.done && v2.progress === 1 && v2.percent === 100);
t('Ligne atteinte : Objectif atteint · 10 324 / 10 000 pas', sp(stepsLine(v2)) === 'Objectif atteint · 10 324 / 10 000 pas');
t('9 999 / 10 000 → non atteint', !stepsView([steps], [{ habit_id: 's', count: 9999 }]).done);

// Sources : jamais de fausse mesure
t('Saisie manuelle → DÉCLARÉ', v1.sourceLabel === 'DÉCLARÉ' && !v1.measured);
t('Apple Santé → MESURÉ · Apple Santé', v2.sourceLabel === 'MESURÉ · Apple Santé' && v2.measured);
const v3 = stepsView([steps], [{ habit_id: 's', count: 5000, source: 'health_connect' }]);
t('Health Connect → MESURÉ · Health Connect', v3.sourceLabel === 'MESURÉ · Health Connect' && v3.measured);

// Aucune donnée inventée
const v4 = stepsView([steps], []);
t('Sans relevé : aucun nombre (jamais 0), aucune source', v4.count === null && v4.sourceLabel === null && v4.progress === 0 && !v4.done);
t('Sans relevé : « Connecter le suivi des pas »', stepsLine(v4) === 'Connecter le suivi des pas');
const v5 = stepsView([H({ id: 'n', kind: 'steps', daily_target: null })], [{ habit_id: 'n', count: 4200 }]);
t('Sans cible : aucune cible inventée, pas d’objectif atteint', v5.target === null && !v5.done && sp(stepsLine(v5)) === '4 200 pas');
t('Aucun objectif configuré : rien n’est supposé', stepsView([], []).habit === null);

// Objectif personnel en « pas » = même objectif
t('Objectif personnel en « pas » reconnu', stepsView([customSteps], [{ habit_id: 'c', count: 3000 }]).count === 3000);
t('Objectif inactif ignoré', stepsView([{ ...steps, active: false } as any], [{ habit_id: 's', count: 3000 }]).habit === null);

// Même donnée dans la carte et dans « Ta journée »
const input: any = { focusAreas: ['movement'], pulseDone: true, closureDone: false, priorityType: 'none', mission: null, session: null,
  movedToday: false, caloriesTarget: 0, kcalToday: 0, mealsToday: 0, habits: [steps], todayLogs: [{ habit_id: 's', count: 6420, source: 'manual' }] };
const move = buildDayPlan(input).find(x => x.key === 'move')!;
t('Ta journée affiche exactement la même valeur que la carte', move.detail === stepsLine(v1) && move.progress === v1.progress && move.done === v1.done);
t('Ta journée : DÉCLARÉ cohérent avec la carte', move.declared === true && move.measured === false);

console.log(`\n${ok} réussis, ${ko} échoués`);
