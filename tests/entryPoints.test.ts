// Points d'entrée vers Activité (contrôle du code source)
import { readFileSync } from 'node:fs';
const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
let ok = 0, ko = 0;
const t = (n: string, c: boolean) => { c ? ok++ : ko++; console.log(c ? '✓' : '✗', n); };

const home = read('src/pages/Home.tsx'), settings = read('src/pages/Settings.tsx'), app = read('src/App.tsx');
const dayPlan = read('src/lib/nox/dayPlan.ts'), steps = read('src/lib/nox/steps.ts');
const monNox = read('src/pages/MonNox.tsx'), weekly = read('src/pages/WeeklyReview.tsx');

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

// ── Lot 5 ──
t('Mon NOX : raccourci « Activité » vers /activity (plus de « Mouvement » vers /movement)', monNox.includes("{ label: 'Activité', path: '/activity', icon: ActivityIcon }") && !monNox.includes("path: '/movement'"));
t('Mon NOX : compteur « Activités » = séances terminées + activités saisies', monNox.includes("['Activités',totalActivities,ActivityIcon,LIME]") && monNox.includes('const totalActivities = totalWorkouts + totalManualActivities;'));
t('Mon NOX : les activités saisies sont comptées depuis movement_logs', /from\('movement_logs'\)\.select\('id', \{ count: 'exact', head: true \}\)\.eq\('user_id'/.test(monNox));
t('Mon NOX : les séances restent comptées depuis workouts terminés', /from\('workouts'\)\.select\('id', \{ count: 'exact', head: true \}\)\.eq\('user_id', user!\.id\)\.eq\('status', 'completed'\)/.test(monNox));
t('Mon NOX : aucun rapprochement entre séance et activité', !/dedup|doublon|merge/i.test(monNox));
t('Mon NOX : texte « Tu as enregistré N activités »', monNox.includes('Tu as enregistré ${totalActivities} activité'));
t('Mon NOX : la règle de mémoire sur les séances est inchangée', monNox.includes("totalWorkouts < 10 ? 'Tes préférences d\\'exercice réelles.' : ''"));
t('Mon NOX : « Ta route » dit « activité »', monNox.includes("{aligned.movement} activité{aligned.movement > 1 ? 's' : ''}") && !monNox.includes('{aligned.movement} mouvement'));
t('Bilan hebdo : titre « ACTIVITÉ », calcul toujours basé sur movement_logs', weekly.includes('>ACTIVITÉ</div>') && !weekly.includes('>MOUVEMENT</div>') && weekly.includes("from('movement_logs').select('sport,duration_min,intensity,date')"));
t('Home : sections de séance titrées « Séance du jour », destinations inchangées', (home.match(/title="Séance du jour"/g) ?? []).length === 2 && !home.includes('title="Mouvement"') && home.includes(`<SectionHeader title="Séance du jour" action="Plus" onAction={() => navigate('/program')} />`));
t('Moi : pas de ligne « Programme d’entraînement »', !settings.includes("Programme d'entraînement") && !settings.includes('Programme d’entraînement'));

console.log(`\n${ok} réussis, ${ko} échoués`);
