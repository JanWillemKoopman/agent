'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let browserClient: SupabaseClient | null = null;

/** Singleton browser-client (anon key). */
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
 * Zorgt dat er een (anonieme) sessie is en geeft het access-token terug.
 * Wordt gebruikt om API-routes RLS-veilig aan te roepen.
 */
export async function ensureAnonymousSession(): Promise<{
  userId: string;
  accessToken: string;
}> {
  const supabase = getSupabaseBrowserClient();

  let {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
    session = data.session;
  }

  if (!session) {
    throw new Error('Kon geen anonieme Supabase-sessie aanmaken.');
  }

  return { userId: session.user.id, accessToken: session.access_token };
}
