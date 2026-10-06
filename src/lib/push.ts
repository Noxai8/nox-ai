// ── NOX — Abonnement de l'appareil aux rappels (Web Push) ────────────────────
// La clé publique VAPID est faite pour être publique. La clé privée reste
// exclusivement dans les secrets Supabase (Edge Functions).
import { supabase } from './supabase';

export const VAPID_PUBLIC_KEY =
  'BDhgYOkpeP2DjIcDIYY4jGlRNJ6pKI-EJZicp4bkre9HVl6oXWzMD6mbdajz1-aAB0CtDdndjS1_tc0Foy0jWyo';

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

export type PushSupport = 'supported' | 'needs_install' | 'unsupported';

/** iPhone/iPad : Web Push uniquement si l'app est installée sur l'écran d'accueil */
export function pushSupport(): PushSupport {
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches || (navigator as any).standalone === true;
  if (ios && !standalone) return 'needs_install';
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported';
  return 'supported';
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  if (pushSupport() !== 'supported') return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return (await reg?.pushManager.getSubscription()) ?? null;
}

/** Demande l'autorisation, abonne l'appareil et l'enregistre dans push_devices */
export async function enablePushOnThisDevice(userId: string): Promise<{ ok: boolean; reason?: string }> {
  if (pushSupport() !== 'supported') return { ok: false, reason: 'unsupported' };
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return { ok: false, reason: 'denied' };

  const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register('/sw.js'));
  await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  }));

  const json = sub.toJSON();
  const { error } = await supabase.from('push_devices').upsert({
    user_id: userId,
    channel: 'web',
    endpoint: sub.endpoint,
    keys: json.keys ?? null,
    platform: /iphone|ipad|ipod/i.test(navigator.userAgent) ? 'ios-web' : /android/i.test(navigator.userAgent) ? 'android-web' : 'desktop-web',
    last_seen_at: new Date().toISOString(),
  }, { onConflict: 'endpoint' });
  if (error) return { ok: false, reason: error.message };
  return { ok: true };
}

export async function disablePushOnThisDevice(): Promise<void> {
  const sub = await currentSubscription();
  if (!sub) return;
  await supabase.from('push_devices').delete().eq('endpoint', sub.endpoint);
  await sub.unsubscribe();
}
