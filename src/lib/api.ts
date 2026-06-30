'use client';

import { getAccessToken } from './supabase/client';
import type { UserSettings, FinalRecipe, TrackedProduct, Deal } from './types';

async function authHeaders(): Promise<HeadersInit> {
  const accessToken = await getAccessToken();
  return { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };
}

export async function fetchSettings(): Promise<UserSettings> {
  const res = await fetch('/api/settings', { headers: await authHeaders() });
  if (!res.ok) throw new Error('Kon instellingen niet laden.');
  return res.json();
}

export async function saveSettings(
  settings: Pick<UserSettings, 'selected_stores' | 'min_price_pp' | 'max_price_pp' | 'excluded_ingredients'>
): Promise<UserSettings> {
  const res = await fetch('/api/settings', {
    method: 'PUT',
    headers: await authHeaders(),
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error('Kon instellingen niet opslaan.');
  return res.json();
}

export interface SavedRecipe {
  id: string;
  title: string;
  recipe_json: FinalRecipe;
  created_at: string;
}

export async function fetchSavedRecipes(): Promise<SavedRecipe[]> {
  const res = await fetch('/api/recipes', { headers: await authHeaders() });
  if (!res.ok) throw new Error('Kon bewaarde recepten niet laden.');
  return res.json();
}

export async function saveRecipe(recipe: FinalRecipe): Promise<SavedRecipe> {
  const res = await fetch('/api/recipes', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ title: recipe.recipe_name, recipe_json: recipe }),
  });
  if (!res.ok) throw new Error('Kon recept niet bewaren.');
  return res.json();
}

export async function deleteRecipe(id: string): Promise<void> {
  const res = await fetch(`/api/recipes?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: await authHeaders(),
  });
  if (!res.ok && res.status !== 204) throw new Error('Kon recept niet verwijderen.');
}

// --- Tracker -----------------------------------------------------------------

export async function fetchTrackedProducts(): Promise<TrackedProduct[]> {
  const res = await fetch('/api/tracker/products', { headers: await authHeaders() });
  if (!res.ok) throw new Error('Kon bijgehouden producten niet laden.');
  return res.json();
}

export async function addTrackedProduct(productName: string): Promise<TrackedProduct> {
  const res = await fetch('/api/tracker/products', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ product_name: productName }),
  });
  if (!res.ok) throw new Error('Kon product niet toevoegen.');
  return res.json();
}

export async function updateTrackedProduct(
  id: string,
  productName: string
): Promise<TrackedProduct> {
  const res = await fetch(`/api/tracker/products?id=${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: await authHeaders(),
    body: JSON.stringify({ product_name: productName }),
  });
  if (!res.ok) throw new Error('Kon product niet bijwerken.');
  return res.json();
}

export async function deleteTrackedProduct(id: string): Promise<void> {
  const res = await fetch(`/api/tracker/products?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: await authHeaders(),
  });
  if (!res.ok && res.status !== 204) throw new Error('Kon product niet verwijderen.');
}

export interface StoreStatus {
  store: string;
  status: 'running' | 'done' | 'failed';
  startedAt: string;
  finishedAt: string | null;
  productsFound: number;
  categoriesFound: number | null;
  confidenceScore: number | null;
}

export interface DealStatus {
  date: string;
  stores: StoreStatus[];
  hasDataToday: boolean;
}

export async function fetchDealStatus(): Promise<DealStatus> {
  const res = await fetch('/api/deals/status', { headers: await authHeaders() });
  if (!res.ok) throw new Error('Kon deal-status niet laden.');
  return res.json();
}

/**
 * Start een handmatige scrape en leest de SSE-stroom. Roept onEvent aan voor
 * elk store-event. Geeft een Promise terug die resolved zodra de stroom
 * gesloten is. Gebruik force=true om ook al-afgeronde runs opnieuw te starten.
 */
export async function streamDealRefresh(
  onEvent: (event: string, data: Record<string, unknown>) => void,
  signal?: AbortSignal,
  force = true
): Promise<void> {
  const headers = await authHeaders();
  const res = await fetch(`/api/deals/refresh?force=${force}`, {
    method: 'POST',
    headers,
    signal,
  });

  if (!res.ok || !res.body) {
    throw new Error(`Refresh mislukt: ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // SSE-berichten zijn gescheiden door dubbele newlines.
    const messages = buffer.split('\n\n');
    buffer = messages.pop() ?? '';

    for (const message of messages) {
      let eventName = '';
      const dataLines: string[] = [];

      for (const line of message.split('\n')) {
        if (line.startsWith('event: ')) {
          eventName = line.slice(7).trim();
        } else if (line.startsWith('data: ')) {
          dataLines.push(line.slice(6));
        }
      }

      if (eventName && dataLines.length > 0) {
        try {
          const data = JSON.parse(dataLines.join('\n')) as Record<string, unknown>;
          onEvent(eventName, data);
        } catch {
          // Malformed JSON — negeer.
        }
      }
    }
  }
}

export async function searchTrackerDeals(): Promise<Deal[]> {
  const res = await fetch('/api/tracker/search', {
    method: 'POST',
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error('Kon aanbiedingen niet zoeken.');
  const data = await res.json();
  return data.deals ?? [];
}
