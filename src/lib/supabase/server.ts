import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Maakt een server-side Supabase-client die handelt namens de ingelogde
 * gebruiker via diens access-token. Hierdoor blijft Row Level Security gelden.
 *
 * Het token wordt door de frontend meegestuurd als `Authorization: Bearer <jwt>`.
 */
export function getSupabaseServerClient(accessToken: string): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Supabase env ontbreekt: zet NEXT_PUBLIC_SUPABASE_URL en NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    );
  }

  return createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Server-side Supabase-client met de service-role key. Omzeilt Row Level
 * Security en wordt UITSLUITEND server-side gebruikt voor de gedeelde
 * aanbiedingen-cache (daily_deals / deal_scrape_runs), die niet per gebruiker is
 * afgeschermd. De key mag nooit naar de client lekken.
 */
export function getSupabaseServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      'Supabase service-config ontbreekt: zet NEXT_PUBLIC_SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY.'
    );
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Haalt het bearer-token uit de Authorization-header van een Request. */
export function getAccessTokenFromRequest(req: Request): string | null {
  const header = req.headers.get('authorization') ?? req.headers.get('Authorization');
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length).trim() || null;
}
