export function parseRestSeconds(value: string | number | null | undefined): number {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.round(value);
  }

  if (!value || typeof value !== 'string') return 90;

  const normalized = value.trim().toLowerCase().replace(',', '.');
  const matches = normalized.match(/\d+(?:\.\d+)?/g)?.map(Number) || [];
  if (matches.length === 0) return 90;

  const average = matches.length >= 2 ? (matches[0] + matches[1]) / 2 : matches[0];
  const isMinutes = /\b(min|mins|minute|minutes)\b/.test(normalized);
  const seconds = isMinutes ? average * 60 : average;

  return Math.max(1, Math.round(seconds));
}

function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function calculateTrainingStreak(completedDates: string[], today = new Date()): number {
  const uniqueDays = new Set(
    completedDates
      .map(value => new Date(value))
      .filter(date => !Number.isNaN(date.getTime()))
      .map(localDateKey),
  );

  let streak = 0;
  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  while (uniqueDays.has(localDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}
