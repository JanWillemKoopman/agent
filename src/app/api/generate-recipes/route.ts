import { after } from 'next/server';
import {
  getSupabaseServerClient,
  getSupabaseServiceClient,
  getAccessTokenFromRequest,
} from '@/lib/supabase/server';
import { runKitchenBrigade } from '@/lib/recipes/pipeline';
import type { UserSettings, StatusEvent } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

// Een job die langer dan dit niet meer is bijgewerkt, beschouwen we als gestrand
// (functie voortijdig afgebroken). De client krijgt dan een nette retry-melding.
const STALE_MS = 3 * 60 * 1000;

/**
 * POST — start een achtergrond-generatie en geef direct een jobId terug.
 *
 * De pipeline draait via `after()` LOS van deze request. Daardoor blijft hij
 * doorlopen en wordt het resultaat in de database vastgelegd, ook als de browser
 * de verbinding verbreekt (scherm op slot / app naar achtergrond). De client
 * pollt vervolgens GET ?jobId=... en pikt het resultaat op zodra hij terugkomt.
 */
export async function POST(req: Request) {
  const accessToken = getAccessTokenFromRequest(req);
  if (!accessToken) {
    return new Response('Niet geautoriseerd', { status: 401 });
  }

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
  const excludedIngredients = settings?.excluded_ingredients ?? [];

  // Maak de job-rij aan (service-role: omzeilt RLS).
  const service = getSupabaseServiceClient();
  const { data: job, error: insertErr } = await service
    .from('recipe_generation_jobs')
    .insert({ user_id: user.id, status: 'running', step: 0, status_lines: [] })
    .select('id')
    .single();

  if (insertErr || !job) {
    console.error('Job aanmaken mislukt:', insertErr);
    return new Response('Kon de generatie niet starten.', { status: 500 });
  }

  const jobId = job.id as string;

  // Draai de pipeline na de response, losgekoppeld van de client-verbinding.
  after(async () => {
    const statusLines: StatusEvent[] = [];
    const emit = async (step: number, message: string) => {
      statusLines.push({ step, message });
      // Wacht op de DB-write zodat de client dit stap via polling kan zien
      // voordat de pipeline naar de volgende stap gaat.
      await service
        .from('recipe_generation_jobs')
        .update({ step, status_lines: statusLines, updated_at: new Date().toISOString() })
        .eq('id', jobId);
    };

    try {
      const recipes = await runKitchenBrigade(
        stores,
        emit,
        excludedIngredients
      );
      await service
        .from('recipe_generation_jobs')
        .update({
          status: 'done',
          result_json: recipes,
          status_lines: statusLines,
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId);
    } catch (err) {
      console.error('Pipeline-fout:', err);
      await service
        .from('recipe_generation_jobs')
        .update({
          status: 'error',
          error: err instanceof Error ? err.message : 'Onbekende fout in de pipeline.',
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId);
    }
  });

  return Response.json({ jobId });
}

/**
 * GET ?jobId=... — geeft de huidige status van een job terug zodat de client
 * kan pollen. Een job die te lang stil ligt (functie afgebroken) wordt als
 * mislukt gerapporteerd zodat de gebruiker opnieuw kan proberen.
 */
export async function GET(req: Request) {
  const accessToken = getAccessTokenFromRequest(req);
  if (!accessToken) {
    return new Response('Niet geautoriseerd', { status: 401 });
  }

  const jobId = new URL(req.url).searchParams.get('jobId');
  if (!jobId) {
    return new Response('jobId is verplicht', { status: 400 });
  }

  // Lezen via de gebruiker-client: RLS zorgt dat men alleen eigen jobs ziet.
  const supabase = getSupabaseServerClient(accessToken);
  const { data: job, error } = await supabase
    .from('recipe_generation_jobs')
    .select('status, step, status_lines, result_json, error, updated_at')
    .eq('id', jobId)
    .maybeSingle();

  if (error) return new Response(error.message, { status: 500 });
  if (!job) return new Response('Job niet gevonden', { status: 404 });

  let status = job.status as 'running' | 'done' | 'error';
  let errorMsg = job.error as string | null;

  // Gestrande job: lang niet bijgewerkt terwijl hij 'running' is.
  if (status === 'running' && Date.now() - new Date(job.updated_at).getTime() > STALE_MS) {
    status = 'error';
    errorMsg =
      'Het genereren is onverwacht gestopt. Probeer het opnieuw.';
  }

  return Response.json({
    status,
    step: job.step,
    statusLines: job.status_lines ?? [],
    recipes: job.result_json ?? null,
    error: errorMsg,
  });
}
