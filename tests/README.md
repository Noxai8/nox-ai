# Tests NOX

```bash
npx tsx tests/dayPlan.test.ts                                   # logique de « Ta journée »
npx tsx tests/steps.test.ts                                     # pas du jour (carte + Ta journée)
npx tsx tests/habitCoach.test.ts                                # coaching, preuves, clôture
TZ=Europe/Paris npx tsx tests/localDate.test.ts                 # jour local (changement de jour, été/hiver)
node tests/prepare-reminders.mjs && npx tsx tests/reminders.test.ts   # règles des rappels (simulation)
```
