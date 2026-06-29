import { getSupabaseServerClient, getAccessTokenFromRequest } from '@/lib/supabase/server';
import type { UserSettings } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function getUserAndClient(req: Request) {
  const accessToken = getAccessTokenFromRequest(req);
  if (!accessToken) return null;
  const supabase = getSupabaseServerClient(accessToken);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return { supabase, user };
}

// GET — eigen instellingen (maakt een default-rij aan als die nog niet bestaat).
export async function GET(req: Request) {
  const ctx = await getUserAndClient(req);
  if (!ctx) return new Response('Niet geautoriseerd', { status: 401 });
  const { supabase, user } = ctx;

  let { data } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle<UserSettings>();

  if (!data) {
    const defaults = {
      user_id: user.id,
      selected_stores: ['Albert Heijn'],
      min_price_pp: 0,
      max_price_pp: 10,
      updated_at: new Date().toISOString(),
    };
    const { data: inserted, error } = await supabase
      .from('user_settings')
      .insert(defaults)
      .select()
      .single<UserSettings>();
    if (error) return new Response(error.message, { status: 500 });
    data = inserted;
  }

  return Response.json(data);
}

// PUT — instellingen opslaan (upsert).
export async function PUT(req: Request) {
  const ctx = await getUserAndClient(req);
  if (!ctx) return new Response('Niet geautoriseerd', { status: 401 });
  const { supabase, user } = ctx;

  const body = await req.json();
  const payload = {
    user_id: user.id,
    selected_stores: Array.isArray(body.selected_stores) ? body.selected_stores : [],
    min_price_pp: Number(body.min_price_pp) || 0,
    max_price_pp: Number(body.max_price_pp) || 0,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('user_settings')
    .upsert(payload, { onConflict: 'user_id' })
    .select()
    .single<UserSettings>();

  if (error) return new Response(error.message, { status: 500 });
  return Response.json(data);
}
