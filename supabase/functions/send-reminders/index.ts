// ── NOX — send-reminders ─────────────────────────────────────────────────────
// Fichier autonome (aucun import local) : peut être collé tel quel dans l'éditeur
// d'Edge Functions du dashboard Supabase.
//
// Deux usages :
//  1. Appel programmé toutes les 15 min (en-tête x-cron-secret) → rappels du moment
//  2. Appel depuis l'app avec { test: true } → notification de test vers ses appareils
//
// Secrets requis : VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, CRON_SECRET
// (SUPABASE_URL, SUPABASE_ANON_KEY et SUPABASE_SERVICE_ROLE_KEY sont fournis par Supabase)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT')!,
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!,
);

// ── Voix de NOXI (même ton que l'app : chaleureux, jamais culpabilisant) ──────
// Règle absolue : aucun rappel ne nomme une habitude.
type Kind = 'morning' | 'evening' | 'habits' | 'weekly';
const LINES: Record<Kind, string[]> = {
  morning: [
    'Ton Pulse m’attend. Promis, c’est plus rapide qu’un café.',
    'Bien dormi ? Trois petits chiffres et je m’occupe du reste.',
    'Nouvelle journée. Dis-moi comment tu arrives, je te dis ce qui compte.',
    'Avant de foncer : comment va la machine ce matin ?',
  ],
  evening: [
    'On referme la journée ensemble ? Trente secondes, pas une de plus.',
    'Avant de dormir : raconte-moi ta journée en trois taps.',
    'La journée touche à sa fin. Un dernier point et c’est rangé.',
  ],
  habits: [
    'Petit point sur tes objectifs du jour ?',
    'Un objectif attend encore d’être noté. Dix secondes, et c’est fait.',
    'Où en est ta journée ? Je garde la trace pour toi.',
  ],
  weekly: [
    'Ta semaine est prête. J’ai remarqué deux, trois trucs.',
    'Ton bilan de la semaine t’attend. Cinq minutes de recul, ça change tout.',
  ],
};
const URLS: Record<Kind, string> = { morning: '/pulse', evening: '/closure', habits: '/home', weekly: '/weekly-review' };

function hash(s: string) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }
const line = (kind: Kind, date: string) => LINES[kind][hash(`${date}:${kind}`) % LINES[kind].length];

// ── Heure locale de l'utilisateur ────────────────────────────────────────────
function localNow(tz: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', weekday: 'short', hourCycle: 'h23',
    }).formatToParts(new Date()).map(p => [p.type, p.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
    sunday: parts.weekday === 'Sun',
  };
}
const toMin = (t: string) => { const [h, m] = t.slice(0, 5).split(':').map(Number); return h * 60 + m; };
const inWindow = (now: number, start: number) => now >= start && now < start + 30; // cron 15 min → fenêtre 30 min
const inQuiet = (now: number, qs: number, qe: number) => (qs <= qe ? now >= qs && now < qe : now >= qs || now < qe);

async function sendTo(sb: any, userId: string, payload: { title: string; body: string; url: string }) {
  const { data: devices } = await sb.from('push_devices').select('id, endpoint, keys').eq('user_id', userId).eq('channel', 'web');
  let sent = 0;
  for (const d of devices ?? []) {
    try {
      await webpush.sendNotification({ endpoint: d.endpoint, keys: d.keys }, JSON.stringify(payload), { TTL: 3600 });
      sent++;
    } catch (e: any) {
      // Abonnement expiré ou révoqué : on retire l'appareil
      if (e?.statusCode === 404 || e?.statusCode === 410) await sb.from('push_devices').delete().eq('id', d.id);
      else console.error('push error', e?.statusCode, e?.body);
    }
  }
  return sent;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const url = Deno.env.get('SUPABASE_URL')!;
  const service = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const body = await req.json().catch(() => ({}));

  // ── 2. Notification de test, déclenchée par l'utilisateur connecté ─────────
  if (body?.test === true) {
    const auth = req.headers.get('Authorization') ?? '';
    const anon = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await anon.auth.getUser();
    if (!user) return json({ error: 'UNAUTHENTICATED' }, 401);
    const sent = await sendTo(service, user.id, { title: 'NOXI', body: 'C’est moi. Les rappels fonctionnent sur cet appareil.', url: '/home' });
    return json({ sent });
  }

  // ── 1. Passage programmé ───────────────────────────────────────────────────
  const secret = Deno.env.get('CRON_SECRET');
  if (!secret || req.headers.get('x-cron-secret') !== secret) return json({ error: 'FORBIDDEN' }, 403);

  const { data: prefsRows, error } = await service.from('reminder_prefs').select('*').eq('enabled', true);
  if (error) return json({ error: error.message }, 500);

  let sentTotal = 0;
  for (const p of prefsRows ?? []) {
    const now = localNow(p.timezone || 'Europe/Paris');
    if (inQuiet(now.minutes, toMin(p.quiet_start), toMin(p.quiet_end))) continue;

    const due: Kind[] = [];
    if (p.morning && inWindow(now.minutes, toMin(p.morning_time))) due.push('morning');
    if (p.habits_check && inWindow(now.minutes, 17 * 60 + 30)) due.push('habits');
    if (p.evening && inWindow(now.minutes, toMin(p.evening_time))) due.push('evening');
    if (p.weekly && now.sunday && inWindow(now.minutes, 18 * 60)) due.push('weekly');
    if (!due.length) continue;

    const { count: sentToday } = await service.from('reminder_log')
      .select('id', { count: 'exact', head: true }).eq('user_id', p.user_id).eq('local_date', now.date);
    let budget = (p.max_per_day ?? 2) - (sentToday ?? 0);

    for (const kind of due) {
      if (budget <= 0) break;

      // Rappel inutile si l'action est déjà faite : on ne dérange pas
      if (kind === 'morning') {
        const { count } = await service.from('daily_pulses').select('id', { count: 'exact', head: true }).eq('user_id', p.user_id).eq('date', now.date);
        if (count) continue;
      }
      if (kind === 'evening') {
        const { count } = await service.from('daily_closures').select('id', { count: 'exact', head: true }).eq('user_id', p.user_id).eq('date', now.date);
        if (count) continue;
      }
      if (kind === 'habits') {
        const { data: hs } = await service.from('user_habits').select('id').eq('user_id', p.user_id).eq('active', true);
        if (!hs?.length) continue;
        const { data: logs } = await service.from('habit_logs').select('habit_id').eq('user_id', p.user_id).eq('date', now.date);
        const logged = new Set((logs ?? []).map((l: any) => l.habit_id));
        if (hs.every((h: any) => logged.has(h.id))) continue;
      }

      // L'historique empêche tout doublon (unique user + type + jour)
      const { error: logErr } = await service.from('reminder_log').insert({ user_id: p.user_id, kind, local_date: now.date });
      if (logErr) continue;

      sentTotal += await sendTo(service, p.user_id, { title: 'NOXI', body: line(kind, now.date), url: URLS[kind] });
      budget--;
    }
  }
  return json({ ok: true, sent: sentTotal });
});
