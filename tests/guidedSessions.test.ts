import { readFileSync } from 'node:fs';
import { programSessions, sessionRouteId, todaySessionFromProgram } from '../src/lib/nox/guidedSessions';

let ok = 0, ko = 0;
const t = (n: string, c: boolean) => { c ? ok++ : ko++; console.log(c ? '✓' : '✗', n); };

// Copie littérale de l'ancienne règle de la Home (avant extraction), pour prouver l'équivalence
function legacyHome(program: any, now: Date) {
  const sessions = program?.program_json?.sessions || [];
  const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  return sessions.find((session: any) =>
    String(session?.day || '').toLowerCase().includes(dayNames[now.getDay()].toLowerCase().slice(0, 3))
  ) || null;
}

const programs: any[] = [
  null, undefined, {}, { program_json: null }, { program_json: { sessions: [] } },
  { program_json: { sessions: [{ id: 'a', day: 'Lundi', name: 'Full Body A' }, { id: 'b', day: 'Jeudi', name: 'Full Body B' }] } },
  { program_json: { sessions: [{ day: 'LUN', name: 'Haut' }, { day: 'MER', name: 'Bas' }, { day: 'VEN', name: 'Complet' }] } },
  { program_json: { sessions: [{ day: 'Mardi / Samedi', name: 'Cardio' }, { day: null, name: 'Sans jour' }, { name: 'Pas de champ day' }] } },
  { program_json: { sessions: [{ day: 'dimanche', name: 'Repos actif' }, { day: 'Dim', name: 'Doublon' }] } },
];
// Une semaine complète (lundi 5 oct. 2026 → dimanche 11 oct. 2026)
const week = Array.from({ length: 7 }, (_, i) => new Date(2026, 9, 5 + i, 9, 0));
let same = true;
for (const p of programs) for (const d of week) if (todaySessionFromProgram(p, d) !== legacyHome(p, d)) same = false;
t('Règle identique à l’ancienne règle de la Home (9 programmes × 7 jours)', same);

const p1 = programs[5];
t('Lundi → « Full Body A »', todaySessionFromProgram(p1, week[0])?.name === 'Full Body A');
t('Mardi → aucune séance', todaySessionFromProgram(p1, week[1]) === null);
t('Jours abrégés en majuscules (« VEN ») reconnus', todaySessionFromProgram(programs[6], week[4])?.name === 'Complet');
t('Sans programme → aucune séance, aucune liste', todaySessionFromProgram(null, week[0]) === null && programSessions(null).length === 0);
t('Première séance correspondante retenue (comme avant)', todaySessionFromProgram(programs[8], week[6])?.name === 'Repos actif');

// Identifiant de démarrage : même valeur que l'écran Programme (session.id ?? index)
t('Séance avec id → son id', sessionRouteId(p1, todaySessionFromProgram(p1, week[0])) === 'a');
t('Séance sans id → son index dans le programme', sessionRouteId(programs[6], todaySessionFromProgram(programs[6], week[2])) === '1');
t('Aucune séance → aucun lien', sessionRouteId(p1, null) === null && sessionRouteId(p1, { day: 'Lundi' }) === null);

// La Home utilise bien la source partagée, sans règle locale
const home = readFileSync(new URL('../src/pages/Home.tsx', import.meta.url), 'utf8');
t('Home : séance du jour issue du module partagé', home.includes('const todaySession = todaySessionFromProgram(program);') && !home.includes("const dayNames = ['Dimanche'"));

console.log(`\n${ok} réussis, ${ko} échoués`);
