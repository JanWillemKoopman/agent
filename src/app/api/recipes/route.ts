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

// GET — eigen bewaarde recepten.
export async function GET(req: Request) {
  const ctx = await getUserAndClient(req);
  if (!ctx) return new Response('Niet geautoriseerd', { status: 401 });
  const { supabase, user } = ctx;

  const { data, error } = await supabase
    .from('saved_recipes')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return new Response(error.message, { status: 500 });
  return Response.json(data);
}

// POST — recept bewaren.
export async function POST(req: Request) {
  const ctx = await getUserAndClient(req);
  if (!ctx) return new Response('Niet geautoriseerd', { status: 401 });
  const { supabase, user } = ctx;

  const body = await req.json();
  if (!body.title || !body.recipe_json) {
    return new Response('title en recipe_json zijn verplicht', { status: 400 });
  }

  const { data, error } = await supabase
    .from('saved_recipes')
    .insert({
      user_id: user.id,
      title: String(body.title),
      recipe_json: body.recipe_json,
    })
    .select()
    .single();

  if (error) return new Response(error.message, { status: 500 });
  return Response.json(data);
}

// DELETE — bewaard recept verwijderen op ?id=...
export async function DELETE(req: Request) {
  const ctx = await getUserAndClient(req);
  if (!ctx) return new Response('Niet geautoriseerd', { status: 401 });
  const { supabase, user } = ctx;

  const id = new URL(req.url).searchParams.get('id');
  if (!id) return new Response('id is verplicht', { status: 400 });

  const { error } = await supabase
    .from('saved_recipes')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return new Response(error.message, { status: 500 });
  return new Response(null, { status: 204 });
}
