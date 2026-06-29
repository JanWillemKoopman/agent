import { NextResponse } from 'next/server';
import { getSupabaseServerClient, getAccessTokenFromRequest } from '@/lib/supabase/server';

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const token = getAccessTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 });
    }
    const supabase = getSupabaseServerClient(token);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 });
    }

    const subscription = await request.json();
    const { endpoint, keys } = subscription as {
      endpoint: string;
      keys: { p256dh: string; auth: string };
    };

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ error: 'Ongeldige subscription.' }, { status: 400 });
    }

    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        user_id: user.id,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
      { onConflict: 'endpoint' }
    );

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Onbekende fout';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
