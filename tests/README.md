# Tests NOX

```bash
npx tsx tests/dayPlan.test.ts                                   # logique de « Ta journée »
npx tsx tests/steps.test.ts                                     # pas du jour (carte + Ta journée)
node tests/prepare-reminders.mjs && npx tsx tests/reminders.test.ts   # règles des rappels (simulation)
```
