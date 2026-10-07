# Tests NOX

```bash
npx tsx tests/dayPlan.test.ts                                   # logique de « Ta journée »
npx tsx tests/steps.test.ts                                     # pas du jour (carte + Ta journée)
npx tsx tests/habitCoach.test.ts                                # coaching, preuves, clôture
npx tsx tests/edgeFunctions.test.ts                             # appels aux Edge Functions, erreurs lisibles
TZ=Europe/Paris npx tsx tests/activity.test.ts                  # page Activité (lecture seule)
npx tsx tests/entryPoints.test.ts                               # points d’entrée vers Activité
TZ=Europe/Paris npx tsx tests/localDate.test.ts                 # jour local (changement de jour, été/hiver)
node tests/prepare-reminders.mjs && npx tsx tests/reminders.test.ts   # règles des rappels (simulation)
```
