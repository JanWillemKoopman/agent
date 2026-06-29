import { getSupabaseServerClient, getAccessTokenFromRequest } from '@/lib/supabase/server';
import { searchTrackerDealsForStore } from '@/lib/gemini/agents';
import type { UserSettings } from '@/lib/types';

// Edge runtime: omzeilt de 10s serverless-timeout voor de Gemini-calls.
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const accessToken = getAccessTokenFromRequest(req);
  if (!accessToken) return new Response('Niet geautoriseerd', { status: 401 });

  const supabase = getSupabaseServerClient(accessToken);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response('Niet geautoriseerd', { status: 401 });

  // Haal instellingen op (geselecteerde winkels).
  const { data: settings } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle<UserSettings>();

  const stores: string[] = settings?.selected_stores?.length
    ? settings.selected_stores
    : ['Albert Heijn'];

  // Haal bij te houden producten op.
  const { data: products } = await supabase
    .from('tracked_products')
    .select('product_name')
    .eq('user_id', user.id);

  const productNames: string[] = (products ?? []).map(
    (p: { product_name: string }) => p.product_name
  );

  if (productNames.length === 0) {
    return Response.json({ deals: [] });
  }

  // Zoek parallel per winkel of de producten in de aanbieding zijn.
  const results = await Promise.allSettled(
    stores.map((store) => searchTrackerDealsForStore(productNames, store))
  );

  const deals = results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));

  return Response.json({ deals });
}
