import {
  getSupabaseServerClient,
  getSupabaseServiceClient,
  getAccessTokenFromRequest,
} from '@/lib/supabase/server';
import { amsterdamDate } from '@/lib/recipes/deals-cache';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const accessToken = getAccessTokenFromRequest(req);
  if (!accessToken) return new Response('Niet geautoriseerd', { status: 401 });

  const supabase = getSupabaseServerClient(accessToken);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response('Niet geautoriseerd', { status: 401 });

  const service = getSupabaseServiceClient();
  const day = amsterdamDate();

  const [runsResult, countsResult] = await Promise.all([
    service
      .from('deal_scrape_runs')
      .select(
        'store, status, started_at, finished_at, products_found, categories_found, confidence_score'
      )
      .eq('deal_date', day),
    service
      .from('daily_deals')
      .select('store')
      .eq('deal_date', day),
  ]);

  const productCountsByStore = (countsResult.data ?? []).reduce<Record<string, number>>(
    (acc, row) => {
      acc[row.store] = (acc[row.store] ?? 0) + 1;
      return acc;
    },
    {}
  );

  const stores = (runsResult.data ?? []).map((run) => ({
    store: run.store,
    status: run.status as 'running' | 'done' | 'failed',
    startedAt: run.started_at as string,
    finishedAt: run.finished_at as string | null,
    productsFound: productCountsByStore[run.store] ?? (run.products_found as number | null) ?? 0,
    categoriesFound: run.categories_found as number | null,
    confidenceScore: run.confidence_score as number | null,
  }));

  // True zodra er 'done' runs zijn, MAAR ook als er deals in daily_deals staan
  // (bv. vorige run slaagde, nieuwe run loopt nog of de SSE-verbinding viel weg).
  const hasDealsInDb = Object.values(productCountsByStore).some((n) => n > 0);
  const hasDataToday = stores.some((s) => s.status === 'done') || hasDealsInDb;

  return Response.json({ date: day, stores, hasDataToday });
}
