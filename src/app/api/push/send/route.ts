// Node.js runtime: web-push gebruikt Node.js crypto, niet beschikbaar in Edge.
import {
  getSupabaseServerClient,
  getSupabaseServiceClient,
  getAccessTokenFromRequest,
} from '@/lib/supabase/server';
import { sendPushNotifications, type PushPayload } from '@/lib/push';

export async function POST(req: Request) {
  const token = getAccessTokenFromRequest(req);
  if (!token) return new Response('Niet geautoriseerd', { status: 401 });

  const supabase = getSupabaseServerClient(token);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response('Niet geautoriseerd', { status: 401 });

  const payload = (await req.json()) as PushPayload;
  if (!payload?.title || !payload?.body) {
    return new Response('Ongeldige payload', { status: 400 });
  }

  const service = getSupabaseServiceClient();
  await sendPushNotifications(service, user.id, payload);

  return Response.json({ ok: true });
}
