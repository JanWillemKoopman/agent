'use client';

import { useEffect, useMemo, useState } from 'react';
import { Header } from './components/Header';
import { GenerateButton } from './components/GenerateButton';
import { StatusStream } from './components/StatusStream';
import { RecipeGrid } from './components/RecipeGrid';
import { SettingsModal } from './components/SettingsModal';
import { UpdateBanner } from './components/UpdateBanner';
import { useGenerateRecipes } from './hooks/useGenerateRecipes';
import { useServiceWorkerUpdate } from './hooks/useServiceWorkerUpdate';
import {
  fetchSavedRecipes,
  saveRecipe,
  deleteRecipe,
  type SavedRecipe,
} from '@/lib/api';
import { ensureAnonymousSession } from '@/lib/supabase/client';
import type { FinalRecipe } from '@/lib/types';

export default function Home() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [saved, setSaved] = useState<SavedRecipe[]>([]);
  const { statusLines, recipes, isGenerating, error, generate } = useGenerateRecipes();
  const { updateAvailable, refresh } = useServiceWorkerUpdate();

  // Zorg voor een anonieme sessie en laad bewaarde recepten bij mount.
  useEffect(() => {
    ensureAnonymousSession()
      .then(() => fetchSavedRecipes())
      .then(setSaved)
      .catch((e) => console.error('Init mislukt:', e));
  }, []);

  const savedTitles = useMemo(
    () => new Set(saved.map((s) => s.title)),
    [saved]
  );

  const handleToggleSave = async (recipe: FinalRecipe) => {
    const existing = saved.find((s) => s.title === recipe.recipe_name);
    try {
      if (existing) {
        await deleteRecipe(existing.id);
        setSaved((prev) => prev.filter((s) => s.id !== existing.id));
      } else {
        const created = await saveRecipe(recipe);
        setSaved((prev) => [created, ...prev]);
      }
    } catch (e) {
      console.error('Bewaren mislukt:', e);
    }
  };

  const savedRecipeObjects = useMemo(
    () => saved.map((s) => s.recipe_json),
    [saved]
  );

  return (
    <div className="min-h-screen bg-appBg">
      <Header onOpenSettings={() => setSettingsOpen(true)} />

      <main className="mx-auto max-w-2xl space-y-5 p-4 pb-24">
        <GenerateButton onClick={generate} isGenerating={isGenerating} />

        <StatusStream lines={statusLines} isGenerating={isGenerating} />

        {error && (
          <div className="rounded-card border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <RecipeGrid
          recipes={recipes}
          savedTitles={savedTitles}
          onToggleSave={handleToggleSave}
          title={recipes.length > 0 ? 'Voorgestelde recepten' : undefined}
        />

        {recipes.length === 0 && savedRecipeObjects.length > 0 && (
          <RecipeGrid
            recipes={savedRecipeObjects}
            savedTitles={savedTitles}
            onToggleSave={handleToggleSave}
            title="Bewaarde recepten"
          />
        )}

        {recipes.length === 0 && !isGenerating && savedRecipeObjects.length === 0 && (
          <p className="pt-8 text-center text-sm text-gray-500">
            Druk op de knop om goedkope recepten te genereren op basis van de
            aanbiedingen van deze week.
          </p>
        )}
      </main>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <UpdateBanner visible={updateAvailable} onRefresh={refresh} />
    </div>
  );
}
