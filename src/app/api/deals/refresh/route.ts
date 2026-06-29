import {
  getSupabaseServerClient,
  getSupabaseServiceClient,
  getAccessTokenFromRequest,
} from '@/lib/supabase/server';
import { forageDeals } from '@/lib/gemini/agents';
import { amsterdamDate } from '@/lib/recipes/deals-cache';
import { sseComment, sseEvent } from '@/lib/sse';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserSettings } from '@/lib/types';

// Edge runtime + keep-alive stream: de scrape kan langer duren dan de 25s-limiet
// van een gewone (gratis) serverless-response, dus we houden de verbinding open —
// net als de generate-route. De client vuurt dit endpoint af zonder de body in de
// UI af te wachten.
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

/**
 * Probeert de scrape voor (store, day) atomair te claimen. Geeft true terug als
 * deze aanroep de scrape mag uitvoeren. De unieke PK op (store, deal_date) zorgt
 * dat maar één tab/apparaat tegelijk scrapet. Een eerder 'failed' run mag opnieuw
 * geclaimd worden zodat transiente fouten alsnog hersteld worden.
 */
async function claimRun(
  service: SupabaseClient,
  store: string,
  day: string
): Promise<boolean> {
  const { error } = await service
    .from('deal_scrape_runs')
    .insert({ store, deal_date: day, status: 'running', started_at: new Date().toISOString() });

  if (!error) return true;

  // 23505 = unique_violation → er bestaat al een run voor vandaag.
  if (error.code !== '23505') {
    console.error(`Claim ${store} faalde:`, error);
    return false;
  }

  // Alleen opnieuw proberen als de vorige run mislukt was. De voorwaarde
  // status='failed' maakt dit atomair: maar één retry wint.
  const { data: retried } = await service
    .from('deal_scrape_runs')
    .update({ status: 'running', started_at: new Date().toISOString(), finished_at: null })
    .eq('store', store)
    .eq('deal_date', day)
    .eq('status', 'failed')
    .select('store');

  return !!retried?.length;
}

/** Scrapet één winkel (indien geclaimd) en schrijft het resultaat naar de cache. */
async function scrapeStore(
  service: SupabaseClient,
  store: string,
  day: string
): Promise<void> {
  const claimed = await claimRun(service, store, day);
  if (!claimed) return; // Een ander doet (of deed) deze winkel al.

  try {
    const deals = await forageDeals(store);

    // Idempotent: vervang eventuele bestaande rijen van vandaag.
    await service.from('daily_deals').delete().eq('store', store).eq('deal_date', day);

    if (deals.length > 0) {
      const rows = deals.map((d) => ({
        store,
        deal_date: day,
        product_name: d.product_name,
        deal_type: d.deal_type,
        min_quantity: d.min_quantity,
        bundle_price: d.bundle_price,
        deal_price: d.deal_price,
        original_price: d.original_price,
        deal_description: d.deal_description,
        supermarket: d.supermarket,
      }));
      await service.from('daily_deals').insert(rows);
    }

    await service
      .from('deal_scrape_runs')
      .update({ status: 'done', finished_at: new Date().toISOString() })
      .eq('store', store)
      .eq('deal_date', day);
  } catch (err) {
    console.error(`Scrape ${store} faalde:`, err);
    await service
      .from('deal_scrape_runs')
      .update({ status: 'failed', finished_at: new Date().toISOString() })
      .eq('store', store)
      .eq('deal_date', day);
  }
}

export async function POST(req: Request) {
  const accessToken = getAccessTokenFromRequest(req);
  if (!accessToken) return new Response('Niet geautoriseerd', { status: 401 });

  // Identificeer de gebruiker en lees zijn geselecteerde winkels (RLS via JWT).
  const supabase = getSupabaseServerClient(accessToken);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response('Niet geautoriseerd', { status: 401 });

  const { data: settings } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle<UserSettings>();

  const stores = settings?.selected_stores?.length
    ? settings.selected_stores
    : ['Albert Heijn'];

  const service = getSupabaseServiceClient();
  const day = amsterdamDate();

  const stream = new ReadableStream({
    async start(controller) {
      // Keep-alive zodat de verbinding (en dus de functie) blijft leven tijdens
      // de scrape.
      let ping: ReturnType<typeof setInterval> | null = setInterval(() => {
        try {
          controller.enqueue(sseComment());
        } catch {
          if (ping) clearInterval(ping);
        }
      }, 12_000);

      try {
        await Promise.allSettled(stores.map((store) => scrapeStore(service, store, day)));
        controller.enqueue(sseEvent('done', { ok: true }));
      } catch (err) {
        console.error('Deals-refresh faalde:', err);
        controller.enqueue(sseEvent('error', { message: 'Refresh mislukt.' }));
      } finally {
        if (ping) clearInterval(ping);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
