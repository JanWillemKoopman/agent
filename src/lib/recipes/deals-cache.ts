import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseServiceClient } from '../supabase/server';
import { forageDeals } from '../gemini/agents';
import type { Deal } from '../types';

// Hoe lang generate maximaal wacht op een nog lopende scrape voordat hij
// terugvalt op live foraging.
const WAIT_TIMEOUT_MS = 40_000;
const POLL_INTERVAL_MS = 2_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Kalenderdatum (YYYY-MM-DD) in Europe/Amsterdam — de sleutel van de dagcache. */
export function amsterdamDate(date = new Date()): string {
  // en-CA levert het ISO-formaat YYYY-MM-DD op.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Amsterdam',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** Mapt een rij uit daily_deals terug naar het Deal-type van de pipeline. */
function rowToDeal(row: Record<string, unknown>): Deal {
  return {
    product_name: String(row.product_name),
    deal_price: Number(row.deal_price),
    original_price: row.original_price == null ? null : Number(row.original_price),
    supermarket: String(row.supermarket),
    deal_type: row.deal_type as Deal['deal_type'],
    min_quantity: Number(row.min_quantity ?? 1),
    bundle_price: row.bundle_price == null ? null : Number(row.bundle_price),
    deal_description:
      row.deal_description == null ? null : String(row.deal_description),
  };
}

async function readCachedDeals(
  service: SupabaseClient,
  store: string,
  day: string
): Promise<Deal[]> {
  const { data } = await service
    .from('daily_deals')
    .select('*')
    .eq('store', store)
    .eq('deal_date', day);
  return (data ?? []).map(rowToDeal);
}

/**
 * Bepaalt de aanbiedingen voor één winkel:
 *  - run 'done'    → gebruik de gecachte rijen (geen LLM-call);
 *  - run 'running' → poll tot 'done' of timeout, daarna cache lezen;
 *  - geen run / 'failed' / timeout → val terug op live foraging (huidig gedrag).
 */
async function resolveStoreDeals(
  service: SupabaseClient,
  store: string,
  day: string
): Promise<Deal[]> {
  const deadline = Date.now() + WAIT_TIMEOUT_MS;

  for (;;) {
    const { data: run } = await service
      .from('deal_scrape_runs')
      .select('status')
      .eq('store', store)
      .eq('deal_date', day)
      .maybeSingle<{ status: string }>();

    if (run?.status === 'done') {
      return readCachedDeals(service, store, day);
    }

    if (run?.status === 'running' && Date.now() < deadline) {
      await sleep(POLL_INTERVAL_MS);
      continue;
    }

    // Geen run-rij, mislukt, of we wachtten te lang → live fallback.
    return forageDeals(store);
  }
}

/**
 * Levert de aanbiedingen voor de opgegeven winkels op. Leest uit de dagcache
 * (gevuld door de achtergrond-scrape bij sessie-start) en valt per winkel terug
 * op live foraging als de cache nog niet klaar of mislukt is. Eén gefaalde winkel
 * laat de rest niet vallen (allSettled).
 */
export async function getCachedDealsOrForage(stores: string[]): Promise<Deal[]> {
  const service = getSupabaseServiceClient();
  const day = amsterdamDate();

  const results = await Promise.allSettled(
    stores.map((store) => resolveStoreDeals(service, store, day))
  );

  return results.flatMap((r) => {
    if (r.status === 'fulfilled') return r.value;
    console.error('Aanbiedingen ophalen mislukt voor een winkel:', r.reason);
    return [];
  });
}
