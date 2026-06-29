import { getSupabaseServerClient, getAccessTokenFromRequest } from '@/lib/supabase/server';
import { runKitchenBrigade } from '@/lib/recipes/pipeline';
import { sseEvent, sseComment } from '@/lib/sse';
import type { UserSettings } from '@/lib/types';

// Edge runtime: houdt de SSE-stream open tijdens de AI-stappen en omzeilt de
// 10s serverless-timeout van het gratis Vercel-account. Edge gebruikt globale
// web-API's (fetch, TextEncoder, ReadableStream) — geen Node-specifieke calls.
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const accessToken = getAccessTokenFromRequest(req);
  if (!accessToken) {
    return new Response('Niet geautoriseerd', { status: 401 });
  }

  // Haal de instellingen van de gebruiker op (RLS via JWT).
  const supabase = getSupabaseServerClient(accessToken);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response('Niet geautoriseerd', { status: 401 });
  }

  const { data: settings } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle<UserSettings>();

  const stores = settings?.selected_stores?.length
    ? settings.selected_stores
    : ['Albert Heijn'];
  const minPricePp = settings?.min_price_pp ?? 0;
  const maxPricePp = settings?.max_price_pp ?? 100;

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (step: number, message: string) => {
        controller.enqueue(sseEvent('status', { step, message }));
      };

      // Keep-alive: stuur elke 12s een SSE-comment zodat mobiele browsers
      // (Safari/iOS) de verbinding niet verbreken bij een lang-lopende stap.
      let pingInterval: ReturnType<typeof setInterval> | null = setInterval(() => {
        try {
          controller.enqueue(sseComment());
        } catch {
          if (pingInterval) clearInterval(pingInterval);
        }
      }, 12_000);

      try {
        const recipes = await runKitchenBrigade(stores, minPricePp, maxPricePp, emit);
        controller.enqueue(sseEvent('result', { recipes }));
      } catch (err) {
        console.error('Pipeline-fout:', err);
        controller.enqueue(
          sseEvent('error', {
            message:
              err instanceof Error ? err.message : 'Onbekende fout in de pipeline.',
          })
        );
      } finally {
        if (pingInterval) clearInterval(pingInterval);
        controller.enqueue(sseEvent('done', {}));
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
