import { getSupabaseServerClient, getAccessTokenFromRequest } from '@/lib/supabase/server';

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

// GET — alle bijgehouden producten van de ingelogde gebruiker.
export async function GET(req: Request) {
  const ctx = await getUserAndClient(req);
  if (!ctx) return new Response('Niet geautoriseerd', { status: 401 });
  const { supabase, user } = ctx;

  const { data, error } = await supabase
    .from('tracked_products')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return new Response(error.message, { status: 500 });
  return Response.json(data ?? []);
}

// POST — product toevoegen.
export async function POST(req: Request) {
  const ctx = await getUserAndClient(req);
  if (!ctx) return new Response('Niet geautoriseerd', { status: 401 });
  const { supabase, user } = ctx;

  const body = await req.json();
  if (!body.product_name?.trim()) {
    return new Response('product_name is verplicht', { status: 400 });
  }

  const { data, error } = await supabase
    .from('tracked_products')
    .insert({ user_id: user.id, product_name: String(body.product_name).trim() })
    .select()
    .single();

  if (error) return new Response(error.message, { status: 500 });
  return Response.json(data);
}

// PATCH — productnaam hernoemen op ?id=...
export async function PATCH(req: Request) {
  const ctx = await getUserAndClient(req);
  if (!ctx) return new Response('Niet geautoriseerd', { status: 401 });
  const { supabase, user } = ctx;

  const id = new URL(req.url).searchParams.get('id');
  if (!id) return new Response('id is verplicht', { status: 400 });

  const body = await req.json();
  if (!body.product_name?.trim()) {
    return new Response('product_name is verplicht', { status: 400 });
  }

  const { data, error } = await supabase
    .from('tracked_products')
    .update({ product_name: String(body.product_name).trim() })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) return new Response(error.message, { status: 500 });
  return Response.json(data);
}

// DELETE — product verwijderen op ?id=...
export async function DELETE(req: Request) {
  const ctx = await getUserAndClient(req);
  if (!ctx) return new Response('Niet geautoriseerd', { status: 401 });
  const { supabase, user } = ctx;

  const id = new URL(req.url).searchParams.get('id');
  if (!id) return new Response('id is verplicht', { status: 400 });

  const { error } = await supabase
    .from('tracked_products')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return new Response(error.message, { status: 500 });
  return new Response(null, { status: 204 });
}
