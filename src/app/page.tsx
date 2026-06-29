'use client';

import { useEffect, useMemo, useState } from 'react';
import { Header } from './components/Header';
import { BottomNav, type TabKey } from './components/BottomNav';
import { RecipeTab } from './components/RecipeTab';
import { SettingsPage } from './components/SettingsPage';
import { AccountPage } from './components/AccountPage';
import { RecipeDetail } from './components/RecipeDetail';
import { AuthScreen } from './components/AuthScreen';
import { UpdateBanner } from './components/UpdateBanner';
import { useGenerateRecipes } from './hooks/useGenerateRecipes';
import { useServiceWorkerUpdate } from './hooks/useServiceWorkerUpdate';
import { useAuth } from './auth-context';
import { PhotoOnboarding } from './components/PhotoOnboarding';
import {
  fetchSavedRecipes,
  saveRecipe,
  deleteRecipe,
  type SavedRecipe,
} from '@/lib/api';
import type { FinalRecipe } from '@/lib/types';

export default function Home() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-appBg">
        <i
          className="ph ph-circle-notch animate-spin text-3xl text-ahBlue"
          aria-hidden="true"
        />
      </div>
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

  return <AppShell />;
}

function AppShell() {
  const { user } = useAuth();
  const [tab, setTab] = useState<TabKey>('recepten');
  const [saved, setSaved] = useState<SavedRecipe[]>([]);
  const [detail, setDetail] = useState<FinalRecipe | null>(null);

  // Toon foto-onboarding voor gebruikers die net geregistreerd zijn (< 5 min) en nog geen avatar hebben.
  const [showOnboarding] = useState(() => {
    if (!user) return false;
    const ageMs = Date.now() - new Date(user.created_at).getTime();
    return ageMs < 5 * 60 * 1000 && !user.user_metadata?.avatar_url;
  });
  const [onboardingDone, setOnboardingDone] = useState(false);

  const { statusLines, recipes, isGenerating, error, generate } =
    useGenerateRecipes();
  const { updateAvailable, refresh } = useServiceWorkerUpdate();

  // Laad bewaarde recepten zodra de gebruiker is ingelogd.
  useEffect(() => {
    fetchSavedRecipes()
      .then(setSaved)
      .catch((e) => console.error('Bewaarde recepten laden mislukt:', e));
  }, []);

  const savedTitles = useMemo(
    () => new Set(saved.map((s) => s.title)),
    [saved]
  );
  const savedRecipeObjects = useMemo(
    () => saved.map((s) => s.recipe_json),
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

  return (
    <div className="min-h-screen bg-appBg">
      {showOnboarding && !onboardingDone && (
        <PhotoOnboarding onDone={() => setOnboardingDone(true)} />
      )}

      <Header onNavigateAccount={() => setTab('account')} />

      <main className="mx-auto max-w-2xl p-4 pb-28">
        {tab === 'recepten' && (
          <RecipeTab
            isGenerating={isGenerating}
            statusLines={statusLines}
            recipes={recipes}
            error={error}
            onGenerate={generate}
            savedRecipes={savedRecipeObjects}
            savedTitles={savedTitles}
            onToggleSave={handleToggleSave}
            onOpen={setDetail}
          />
        )}
        {tab === 'instellingen' && <SettingsPage />}
        {tab === 'account' && <AccountPage />}
      </main>

      <BottomNav active={tab} onChange={setTab} />

      {detail && (
        <RecipeDetail
          recipe={detail}
          saved={savedTitles.has(detail.recipe_name)}
          onToggleSave={handleToggleSave}
          onClose={() => setDetail(null)}
        />
      )}

      <UpdateBanner visible={updateAvailable} onRefresh={refresh} />
    </div>
  );
}
