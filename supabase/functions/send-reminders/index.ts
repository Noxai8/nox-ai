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

// Vérifie les secrets VAPID ; renvoie un message clair au lieu de planter
function configureVapid(): string | null {
  const subject = Deno.env.get('VAPID_SUBJECT');
  const pub = Deno.env.get('VAPID_PUBLIC_KEY');
  const priv = Deno.env.get('VAPID_PRIVATE_KEY');
  if (!pub) return 'Secret VAPID_PUBLIC_KEY manquant';
  if (!priv) return 'Secret VAPID_PRIVATE_KEY manquant';
  if (!subject) return 'Secret VAPID_SUBJECT manquant';
  if (!subject.startsWith('mailto:') && !subject.startsWith('https://')) return 'VAPID_SUBJECT doit commencer par mailto:';
  try { webpush.setVapidDetails(subject, pub.trim(), priv.trim()); return null; }
  catch (e: any) { return `Clés VAPID invalides : ${e?.message ?? e}`; }
}

// ── Voix de NOXI (même ton que l'app : chaleureux, jamais culpabilisant) ──────
// Règle absolue : aucun rappel ne nomme une habitude.
type Kind = 'morning' | 'evening' | 'habits' | 'weekly';
// Rappels contextuels : jamais envoyés sans donnée réelle qui les justifie
type Nudge = 'mission_start' | 'movement' | 'nutrition' | 'mission_end' | 'goals';
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
const short = (s: string, n = 60) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);
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

  const vapidError = configureVapid();
  if (vapidError) return json({ error: 'CONFIG', message: vapidError }, 500);

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
    try {
      const sent = await processUser(service, p);
      sentTotal += sent;
    } catch (e: any) {
      console.error('reminders user', p.user_id, e?.message ?? e);
    }
  }
  return json({ ok: true, sent: sentTotal });
});

// ── Décision pour un utilisateur ─────────────────────────────────────────────
// Règles : données réelles uniquement · heures calmes · plafond quotidien · 2 h minimum entre deux
// rappels · un rappel par type et par jour · le rappel de clôture garde sa place dans le quota ·
// au plus un rappel par passage · aucun nom d'habitude · aucun effet XP.
async function processUser(sb: any, p: any): Promise<number> {
  const tz = p.timezone || 'Europe/Paris';
  const now = localNow(tz);
  if (inQuiet(now.minutes, toMin(p.quiet_start), toMin(p.quiet_end))) return 0;

  const uid = p.user_id;
  // Sans appareil abonné, rien à envoyer : on ne calcule rien et on ne consomme pas le quota
  const { data: devices } = await sb.from('push_devices').select('id').eq('user_id', uid).eq('channel', 'web').limit(1);
  if (!devices?.length) return 0;
  const gap = Math.max(120, Number(p.min_gap_minutes ?? 120));
  const eveningMin = toMin(p.evening_time);

  const [{ data: logs }, { data: closure }] = await Promise.all([
    sb.from('reminder_log').select('kind, sent_at').eq('user_id', uid).eq('local_date', now.date),
    sb.from('daily_closures').select('id').eq('user_id', uid).eq('date', now.date).maybeSingle(),
  ]);
  const sentKinds = new Set((logs ?? []).map((l: any) => l.kind));
  const lastSent = Math.max(0, ...(logs ?? []).map((l: any) => new Date(l.sent_at).getTime()));
  const gapOk = !lastSent || Date.now() - lastSent >= gap * 60_000;
  let budget = (p.max_per_day ?? 3) - (logs ?? []).length;
  const reserveEvening = p.evening && !closure && now.minutes < eveningMin + 30 && !sentKinds.has('evening');
  if (!gapOk || budget <= 0) return 0;

  // Un rappel non prioritaire ne passe que s'il reste un créneau pour la clôture, et assez tôt
  // pour respecter l'intervalle minimal avant celle-ci.
  // L'intervalle avant la clôture se calcule sur l'heure PRÉVUE du rappel (insensible au retard d'exécution)
  const nudgeAllowed = (scheduledMin: number) =>
    budget - (reserveEvening ? 1 : 0) >= 1 && (!reserveEvening || scheduledMin + gap <= eveningMin);

  const day = await loadDay(sb, uid, now.date, tz);
  type Msg = { kind: string; title: string; body: string; url: string };
  const candidates: (() => Msg | null)[] = [];

  // Rappels à heure fixe existants
  candidates.push(() => (p.morning && !sentKinds.has('morning') && inWindow(now.minutes, toMin(p.morning_time)) && !day.pulse && nudgeAllowed(toMin(p.morning_time)))
    ? { kind: 'morning', title: 'NOXI', body: line('morning', now.date), url: URLS.morning } : null);
  candidates.push(() => (p.habits_check && !sentKinds.has('habits') && inWindow(now.minutes, 17 * 60 + 30) && day.goalsMissing > 0 && nudgeAllowed(17 * 60 + 30))
    ? { kind: 'habits', title: 'NOXI', body: line('habits', now.date), url: URLS.habits } : null);
  candidates.push(() => (p.weekly && now.sunday && !sentKinds.has('weekly') && inWindow(now.minutes, 18 * 60) && nudgeAllowed(18 * 60))
    ? { kind: 'weekly', title: 'NOXI', body: line('weekly', now.date), url: URLS.weekly } : null);

  // Rappels contextuels
  candidates.push(() => {
    if (!p.nudge_mission || sentKinds.has('mission_start') || !inWindow(now.minutes, 14 * 60) || !nudgeAllowed(14 * 60)) return null;
    if (!day.mission || day.mission.done || day.mission.started) return null;
    return { kind: 'mission_start', title: 'Ta mission t’attend', body: `Tu avais choisi « ${short(day.mission.title)} ». 25 minutes suffisent pour commencer.`, url: '/focus' };
  });
  candidates.push(() => {
    if (!p.nudge_movement || sentKinds.has('movement') || !inWindow(now.minutes, 16 * 60) || !nudgeAllowed(16 * 60)) return null;
    if (!day.steps) return null;                                  // pas d'objectif de pas : aucune affirmation
    if (day.recovery) return null;                               // récupération : NOX ne pousse jamais à bouger
    if (day.steps.count == null) {                               // aucun relevé : on demande, on n'affirme rien
      return { kind: 'movement', title: 'Tes pas du jour', body: 'Tu peux renseigner tes pas pour que NOX suive ton objectif.', url: `/habits/${day.steps.id}` };
    }
    if (day.steps.target == null || day.steps.count >= day.steps.target * 0.4) return null;
    return { kind: 'movement', title: 'Un peu de mouvement ?', body: 'Une marche de 15 minutes ferait déjà avancer ta journée.', url: `/habits/${day.steps.id}` };
  });
  candidates.push(() => {
    if (!p.nudge_nutrition || sentKinds.has('nutrition') || !inWindow(now.minutes, 18 * 60) || !nudgeAllowed(18 * 60)) return null;
    if (!day.nutritionOn || day.kcalTarget <= 0) return null;    // pas d'axe ou pas de vraie cible : rien
    if (day.meals < 2) {                                         // suivi insuffisant : on invite à compléter, sans juger
      return { kind: 'nutrition', title: 'Ton suivi repas', body: 'Ajoute tes repas du jour pour que NOX puisse faire le point.', url: '/fuel' };
    }
    if (day.kcal >= day.kcalTarget * 0.5) return null;
    return { kind: 'nutrition', title: 'Point nutrition', body: 'Ta journée est encore loin de ta zone. Un vrai repas ce soir t’en rapprocherait.', url: '/fuel' };
  });
  candidates.push(() => {
    if (!p.nudge_mission || sentKinds.has('mission_end') || !inWindow(now.minutes, 19 * 60) || !nudgeAllowed(19 * 60)) return null;
    if (!day.mission || day.mission.done || !day.mission.started || day.mission.kind !== 'duration') return null;
    return { kind: 'mission_end', title: 'Ta mission avance', body: `${day.mission.minutes} / ${day.mission.target} min sur « ${short(day.mission.title)} ». Un bloc de plus et c’est bouclé.`, url: '/focus' };
  });
  candidates.push(() => {
    if (!p.nudge_goals || sentKinds.has('goals') || !inWindow(now.minutes, 18 * 60 + 30) || !nudgeAllowed(18 * 60 + 30)) return null;
    if (day.goalsMissing <= 0) return null;
    // Jamais de nom d'objectif : ils peuvent être personnels ou sensibles
    return { kind: 'goals', title: 'Un objectif attend', body: day.goalsMissing > 1 ? `${day.goalsMissing} objectifs du jour ne sont pas encore notés.` : 'Un objectif du jour n’est pas encore noté.', url: '/home' };
  });
  // Clôture : réservée dans le quota, liste uniquement des catégories neutres
  candidates.push(() => {
    if (!p.evening || sentKinds.has('evening') || closure || !inWindow(now.minutes, eveningMin) || budget < 1) return null;
    const rest = [
      day.steps && !day.recovery && !(day.steps.count != null && day.steps.target != null && day.steps.count >= day.steps.target) ? 'Bouger' : null,
      day.nutritionOn && day.kcalTarget > 0 && !(day.kcal >= day.kcalTarget * 0.9 && day.kcal <= day.kcalTarget * 1.1) ? 'Nutrition' : null,
      day.mission && !day.mission.done ? 'Concentration' : null,
      day.goalsMissing > 0 ? `${day.goalsMissing} objectif${day.goalsMissing > 1 ? 's' : ''}` : null,
    ].filter(Boolean);
    return {
      kind: 'evening', title: rest.length ? `Il reste ${rest.length} point${rest.length > 1 ? 's' : ''} aujourd’hui` : 'NOXI',
      body: rest.length ? `${rest.join(' · ')}. Tu peux clôturer quand tu veux.` : line('evening', now.date), url: '/closure',
    };
  });

  for (const pick of candidates) {
    const msg = pick();
    if (!msg) continue;
    const { error: logErr } = await sb.from('reminder_log').insert({ user_id: uid, kind: msg.kind, local_date: now.date });
    if (logErr) continue;                                        // déjà envoyé (unicité type + jour)
    const n = await sendTo(sb, uid, { title: msg.title, body: msg.body, url: msg.url });
    if (n === 0) {
      // Aucun appareil n'a reçu la notification : on n'utilise ni le quota ni le type du jour
      await sb.from('reminder_log').delete().eq('user_id', uid).eq('kind', msg.kind).eq('local_date', now.date);
      return 0;
    }
    budget--;
    return n;                                                    // au plus un rappel par passage
  }
  return 0;
}

// ── Données réelles du jour (aucune valeur supposée) ─────────────────────────
async function loadDay(sb: any, uid: string, date: string, tz: string) {
  const since = new Date(Date.now() - 36 * 3600_000).toISOString();
  const localDate = (iso: string) => new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));
  const [{ data: profile }, { data: target }, { data: food }, { data: pulse }, { data: mission }, { data: habits }, { data: logs }] = await Promise.all([
    sb.from('profiles').select('focus_areas').eq('id', uid).maybeSingle(),
    sb.from('nutrition_targets').select('calories').eq('user_id', uid).maybeSingle(),
    sb.from('food_entries').select('calories, created_at').eq('user_id', uid).gte('created_at', since),
    sb.from('daily_pulses').select('id, energy_score, body_score').eq('user_id', uid).eq('date', date).maybeSingle(),
    sb.from('daily_missions').select('id, title, kind, target_minutes, done_at').eq('user_id', uid).eq('date', date).maybeSingle(),
    sb.from('user_habits').select('id, kind, unit, daily_target, in_day').eq('user_id', uid).eq('active', true),
    sb.from('habit_logs').select('habit_id, count').eq('user_id', uid).eq('date', date),
  ]);
  const focus: string[] | null = profile?.focus_areas ?? null;
  const todayFood = (food ?? []).filter((f: any) => localDate(f.created_at) === date);
  const logOf = (id: string) => (logs ?? []).find((l: any) => l.habit_id === id);

  let m: any = null;
  if (mission) {
    const { data: sessions } = await sb.from('focus_sessions').select('minutes').eq('mission_id', mission.id);
    const minutes = (sessions ?? []).reduce((s: number, x: any) => s + Number(x.minutes ?? 0), 0);
    m = {
      title: mission.title, kind: mission.kind, target: mission.target_minutes, minutes,
      started: (sessions ?? []).length > 0 || !!mission.done_at,
      done: mission.kind === 'task' ? !!mission.done_at : minutes >= (mission.target_minutes ?? Infinity),
    };
  }
  const dayHabits = (habits ?? []).filter((h: any) => h.in_day !== false);
  const isSteps = (h: any) => h.kind === 'steps' || (h.kind === 'custom' && String(h.unit ?? '').trim().toLowerCase() === 'pas');
  const stepsHabit = dayHabits.find(isSteps);
  return {
    pulse: !!pulse,
    nutritionOn: focus == null || focus.includes('nutrition'),
    kcalTarget: Number(target?.calories || 0),
    kcal: todayFood.reduce((s: number, f: any) => s + Number(f.calories || 0), 0),
    meals: todayFood.length,
    mission: m,
    // Même règle de sécurité que le Priority Engine : énergie ou corps très bas = journée de récupération
    recovery: !!pulse && (Number(pulse.energy_score) <= 2 || Number(pulse.body_score) <= 2),
    steps: stepsHabit ? {
      id: stepsHabit.id,
      target: Number(stepsHabit.daily_target) > 0 ? Number(stepsHabit.daily_target) : null,   // jamais de cible inventée
      count: logOf(stepsHabit.id) ? Number(logOf(stepsHabit.id).count) : null,
    } : null,
    goalsMissing: dayHabits.filter((h: any) => !isSteps(h) && !logOf(h.id)).length,
  };
}
