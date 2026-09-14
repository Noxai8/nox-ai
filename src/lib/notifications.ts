export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    return reg;
  } catch { return null; }
}

export function scheduleLocalNotification(title: string, body: string, delayMs: number, url = '/') {
  if (Notification.permission !== 'granted') return;
  setTimeout(() => {
    new Notification(title, { body, icon: '/favicon.ico' });
  }, delayMs);
}

export function scheduleWorkoutReminder(sessionName: string, hour = 9) {
  const now = new Date();
  const target = new Date();
  target.setHours(hour, 0, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1);
  const delay = target.getTime() - now.getTime();
  scheduleLocalNotification(
    '⚡ NOX — Séance du jour',
    `${sessionName} t'attend. C'est le moment.`,
    delay,
    '/home'
  );
}

export function scheduleStreakReminder(streak: number) {
  // Rappel à 20h si pas encore entraîné
  const now = new Date();
  const target = new Date();
  target.setHours(20, 0, 0, 0);
  if (target <= now) return;
  const delay = target.getTime() - now.getTime();
  scheduleLocalNotification(
    `🔥 Streak ${streak} jours en danger`,
    'Tu n\'as pas encore entraîné aujourd\'hui. Garde ton streak !',
    delay,
    '/home'
  );
}
