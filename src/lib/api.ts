'use client';

import { ensureAnonymousSession } from './supabase/client';
import type { UserSettings, FinalRecipe } from './types';

async function authHeaders(): Promise<HeadersInit> {
  const { accessToken } = await ensureAnonymousSession();
  return { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };
}

export async function fetchSettings(): Promise<UserSettings> {
  const res = await fetch('/api/settings', { headers: await authHeaders() });
  if (!res.ok) throw new Error('Kon instellingen niet laden.');
  return res.json();
}

export async function saveSettings(
  settings: Pick<UserSettings, 'selected_stores' | 'min_price_pp' | 'max_price_pp'>
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
