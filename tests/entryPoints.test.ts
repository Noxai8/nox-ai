// Points d'entrée vers Activité (contrôle du code source)
import { readFileSync } from 'node:fs';
const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
let ok = 0, ko = 0;
const t = (n: string, c: boolean) => { c ? ok++ : ko++; console.log(c ? '✓' : '✗', n); };

const home = read('src/pages/Home.tsx'), settings = read('src/pages/Settings.tsx'), app = read('src/App.tsx');
const dayPlan = read('src/lib/nox/dayPlan.ts'), steps = read('src/lib/nox/steps.ts');

t('+ global : « Activité » ouvre /activity/new', /label: 'Activité',\s+icon: Activity, path: '\/activity\/new'/.test(home));
t('+ global : plus d’entrée « Mouvement/Sport »', !home.includes("'Mouvement/Sport'"));
t('Moi : « Activité » ouvre /activity', /title="Activité"[\s\S]{0,120}navigate\('\/activity'\)/.test(settings) && !settings.includes('Mouvement / Sport'));
t('Home : la carte Mes pas ouvre Activité', /title="Mes pas" action="Activité ›" onAction=\{\(\) => navigate\('\/activity'\)\}/.test(home));
t('Home : la carte Mes pas utilise toujours stepsView', /const steps = stepsView\(habits,/.test(home));
t('Home : les CTA de séance programmée restent sur /program', (home.match(/navigate\('\/program'\)/g) ?? []).length === 3);
t('/movement redirige vers /activity/new', /path="\/movement" element=\{<Navigate to="\/activity\/new" replace \/>\}/.test(app));
t('/movement : la page est conservée dans le projet', read('src/pages/Movement.tsx').includes('movement_logs'));
t('/program et /training restent routés', /path="\/program"/.test(app) && /path="\/training\/:sessionId"/.test(app));
t('Navigation du bas inchangée (5 onglets)', ["id: 'home'", "id: 'nutrition'", "id: 'plus'", "id: 'mon-nox'", "id: 'moi'"].every(s => home.includes(s)));
t('Règles de Ta journée inchangées (Bouger toujours mouvement ou séance)', dayPlan.includes("done: i.movedToday, route: i.session ? '/program' : '/movement'"));
t('steps.ts inchangé (règle d’objectif atteint)', steps.includes('done: count != null && target != null && count >= target'));

console.log(`\n${ok} réussis, ${ko} échoués`);
