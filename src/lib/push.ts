import webpush from 'web-push';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface PushPayload {
  title: string;
  body: string;
  tag?: string;
  data?: Record<string, unknown>;
}

/**
 * Stuurt een push-notificatie naar alle actieve abonnementen van een gebruiker.
 * Verlopen subscriptions (HTTP 410) worden automatisch verwijderd.
 */
export async function sendPushNotifications(
  service: SupabaseClient,
  userId: string,
  payload: PushPayload
): Promise<void> {
  const subject = process.env.VAPID_SUBJECT;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!subject || !publicKey || !privateKey) {
    console.warn('[Push] VAPID-sleutels niet geconfigureerd — notificatie overgeslagen.');
    return;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);

  const { data: subs } = await service
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', userId);

  if (!subs?.length) return;

  const body = JSON.stringify(payload);

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body
        );
      } catch (err: unknown) {
        const status = (err as { statusCode?: number })?.statusCode;
        if (status === 410 || status === 404) {
          // Subscription verlopen — verwijder uit DB.
          await service.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
        } else {
          console.error('[Push] Verzenden mislukt:', sub.endpoint, err);
        }
      }
    })
  );
}
