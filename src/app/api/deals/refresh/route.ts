import {
  getSupabaseServerClient,
  getSupabaseServiceClient,
  getAccessTokenFromRequest,
} from '@/lib/supabase/server';
import { forageDealsWithMetrics } from '@/lib/gemini/forager';
import { amsterdamDate } from '@/lib/recipes/deals-cache';
import { sseComment, sseEvent } from '@/lib/sse';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserSettings } from '@/lib/types';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

type Emit = (event: string, data: unknown) => void;

/**
 * Claimt een scrape-run voor (store, day). Bij een handmatige trigger (force=true)
 * mogen ook 'done' en 'failed' runs opnieuw worden geclaimd zodat de gebruiker
 * altijd een verse scrape kan starten.
 */
async function claimRun(
  service: SupabaseClient,
  store: string,
  day: string,
  force: boolean
): Promise<boolean> {
  const { error } = await service
    .from('deal_scrape_runs')
    .insert({ store, deal_date: day, status: 'running', started_at: new Date().toISOString() });

  if (!error) return true;
  if (error.code !== '23505') {
    console.error(`Claim ${store} faalde:`, error);
    return false;
  }

  // Rij bestaat al — bij force ook 'done' resetten, anders alleen 'failed'.
  const allowedStatuses = force ? ['failed', 'done'] : ['failed'];
  const { data: retried } = await service
    .from('deal_scrape_runs')
    .update({ status: 'running', started_at: new Date().toISOString(), finished_at: null })
    .eq('store', store)
    .eq('deal_date', day)
    .in('status', allowedStatuses)
    .select('store');

  return !!retried?.length;
}

/** Scrapet één winkel en stuurt SSE-voortgangsevents naar de client. */
async function scrapeStore(
  service: SupabaseClient,
  store: string,
  day: string,
  force: boolean,
  emit: Emit
): Promise<void> {
  const claimed = await claimRun(service, store, day, force);
  if (!claimed) {
    emit('store-skip', { store });
    return;
  }

  emit('store-start', { store });

  try {
    const { deals, coverage, aiCallsMade, durationMs, duplicatesRemoved } =
      await forageDealsWithMetrics(store);

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
      .update({
        status: 'done',
        finished_at: new Date().toISOString(),
        products_found: deals.length,
        categories_found: coverage.categoriesFound.length,
        confidence_score: coverage.confidenceScore,
        ai_calls_made: aiCallsMade,
        duration_ms: durationMs,
        duplicates_removed: duplicatesRemoved,
      })
      .eq('store', store)
      .eq('deal_date', day);

    emit('store-done', { store, productsFound: deals.length, confidenceScore: coverage.confidenceScore });
  } catch (err) {
    console.error(`Scrape ${store} faalde:`, err);
    await service
      .from('deal_scrape_runs')
      .update({ status: 'failed', finished_at: new Date().toISOString() })
      .eq('store', store)
      .eq('deal_date', day);
    emit('store-error', { store, error: err instanceof Error ? err.message : 'Onbekende fout' });
  }
}

export async function POST(req: Request) {
  const accessToken = getAccessTokenFromRequest(req);
  if (!accessToken) return new Response('Niet geautoriseerd', { status: 401 });

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

  // force=true: handmatige trigger mag 'done' runs opnieuw starten.
  const force = new URL(req.url).searchParams.get('force') === 'true';

  const service = getSupabaseServiceClient();
  const day = amsterdamDate();

  const stream = new ReadableStream({
    async start(controller) {
      const emit: Emit = (event, data) => {
        try {
          controller.enqueue(sseEvent(event, data));
        } catch {
          // Stream al gesloten, negeer.
        }
      };

      let ping: ReturnType<typeof setInterval> | null = setInterval(() => {
        try {
          controller.enqueue(sseComment());
        } catch {
          if (ping) clearInterval(ping);
        }
      }, 12_000);

      try {
        emit('started', { stores });
        await Promise.allSettled(
          stores.map((store) => scrapeStore(service, store, day, force, emit))
        );
        emit('done', { ok: true });
      } catch (err) {
        console.error('Deals-refresh faalde:', err);
        emit('error', { message: 'Refresh mislukt.' });
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
