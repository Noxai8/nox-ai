export type NoxDailyScoreInput = {
  mealCount: number;
  nutritionTargetReady: boolean;
  calorieProgress: number;
  proteinProgress: number;
  activeMinutes: number;
  workouts: number;
  waterMl: number;
  waterGoal: number;
};

export type NoxDailySignal = { label: string; done: boolean };

export function calculateNoxDailyScore(input: NoxDailyScoreInput) {
  const mealCoverage = Math.min(1, input.mealCount / 3);
  const signals: NoxDailySignal[] = [
    { label: 'Nutrition', done: mealCoverage >= .67 },
    ...(input.nutritionTargetReady
      ? [
          { label: 'Calories', done: input.calorieProgress >= .7 },
          { label: 'Protéines', done: input.proteinProgress >= .7 },
        ]
      : []),
    { label: 'Activité', done: input.activeMinutes >= 20 || input.workouts > 0 },
    { label: 'Hydratation', done: input.waterMl >= input.waterGoal * .7 },
  ];
  const done = signals.filter(signal => signal.done).length;
  return {
    score: signals.length ? Math.round((done / signals.length) * 100) : 0,
    signals,
    done,
    total: signals.length,
  };
}
