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
  const mealCoverage = Math.min(1, Math.max(0, input.mealCount) / 3);
  const signals: NoxDailySignal[] = [
    { label: 'Nutrition', done: mealCoverage >= 0.67 },
    ...(input.nutritionTargetReady
      ? [
          { label: 'Calories', done: input.calorieProgress >= 0.7 },
          { label: 'Protéines', done: input.proteinProgress >= 0.7 },
        ]
      : []),
    { label: 'Activité', done: input.activeMinutes >= 20 || input.workouts > 0 },
    { label: 'Hydratation', done: input.waterGoal > 0 && input.waterMl >= input.waterGoal * 0.7 },
  ];
  const done = signals.filter(signal => signal.done).length;
  return {
    score: signals.length ? Math.round((done / signals.length) * 100) : 0,
    signals,
    done,
    total: signals.length,
  };
}

export function localDayKey(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function calculateNoxStreak(values: Array<string | Date>, referenceDate = new Date()) {
  const days = new Set(values.map(localDayKey).filter(Boolean));
  const cursor = new Date(referenceDate);
  cursor.setHours(12, 0, 0, 0);

  if (!days.has(localDayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!days.has(localDayKey(cursor))) return 0;
  }

  let count = 0;
  while (days.has(localDayKey(cursor))) {
    count += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}
