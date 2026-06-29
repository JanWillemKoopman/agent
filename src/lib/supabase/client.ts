'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let browserClient: SupabaseClient | null = null;

/** Singleton browser-client (anon key). Persisteert de sessie in localStorage. */
export function getSupabaseBrowserClient(): SupabaseClient {
  if (browserClient) return browserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Supabase env ontbreekt: zet NEXT_PUBLIC_SUPABASE_URL en NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    );
  }

  browserClient = createBrowserClient(url, anonKey);
  return browserClient;
}

/**
 * Geeft het access-token van de huidige (ingelogde) sessie terug.
 * Gooit een fout als de gebruiker niet is ingelogd — API-routes vereisen dit
 * token zodat Row Level Security blijft gelden.
 */
export async function getAccessToken(): Promise<string> {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Niet ingelogd.');
  }
  return session.access_token;
}
