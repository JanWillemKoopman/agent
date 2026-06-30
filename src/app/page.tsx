'use client';

import { useState } from 'react';
import { Header } from './components/Header';
import { BottomNav, type TabKey } from './components/BottomNav';
import { HomeTab } from './components/HomeTab';
import { RecipeTab } from './components/RecipeTab';
import { TrackerTab } from './components/TrackerTab';
import { SettingsPage } from './components/SettingsPage';
import { AccountPage } from './components/AccountPage';
import { RecipeDetail } from './components/RecipeDetail';
import { AuthScreen } from './components/AuthScreen';
import { UpdateBanner } from './components/UpdateBanner';
import { DataRefreshScreen } from './components/DataRefreshScreen';
import { useGenerateRecipes } from './hooks/useGenerateRecipes';
import { useServiceWorkerUpdate } from './hooks/useServiceWorkerUpdate';
import { useDealStatus } from './hooks/useDealStatus';
import { useDealRefreshStream } from './hooks/useDealRefreshStream';
import { useAuth } from './auth-context';
import { PhotoOnboarding } from './components/PhotoOnboarding';
import { InstallModal } from './components/InstallModal';
import { InstallBanner } from './components/InstallBanner';
import { AppDownloadPage } from './components/AppDownloadPage';
import { useIOSInstallPrompt } from './hooks/useIOSInstallPrompt';
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
  const [tab, setTab] = useState<TabKey>('home');
  const [detail, setDetail] = useState<FinalRecipe | null>(null);
  const [showDataRefresh, setShowDataRefresh] = useState(false);

  const [showOnboarding] = useState(() => {
    if (!user) return false;
    const ageMs = Date.now() - new Date(user.created_at).getTime();
    return ageMs < 5 * 60 * 1000 && !user.user_metadata?.avatar_url;
  });
  const [onboardingDone, setOnboardingDone] = useState(false);

  const { showModal, showBanner, dismissModal, dismissBanner } = useIOSInstallPrompt();
  const [showAppDownload, setShowAppDownload] = useState(false);

  const { statusLines, recipes, isGenerating, error, generate } = useGenerateRecipes();
  const { updateAvailable, refresh } = useServiceWorkerUpdate();

  const { status: dealStatus, refetch: refetchDealStatus } = useDealStatus();

  const {
    isRunning: isRefreshing,
    isDone: refreshDone,
    error: refreshError,
    storeProgress,
    trigger: triggerRefresh,
  } = useDealRefreshStream();

  const handleOpenDataRefresh = () => setShowDataRefresh(true);

  const handleTriggerRefresh = () => {
    const stores = dealStatus?.stores.map((s) => s.store);
    void triggerRefresh(stores);
  };

  return (
    <div className="flex flex-col bg-appBg overflow-hidden" style={{ height: '100dvh' }}>
      {showModal && <InstallModal onDone={dismissModal} onLater={dismissModal} />}
      {showBanner && !showModal && (
        <InstallBanner
          onDismiss={dismissBanner}
          onInstall={() => { dismissBanner(); setShowAppDownload(true); }}
        />
      )}

      {showAppDownload && <AppDownloadPage onClose={() => setShowAppDownload(false)} />}

      {showOnboarding && !onboardingDone && (
        <PhotoOnboarding onDone={() => setOnboardingDone(true)} />
      )}

      {showDataRefresh && (
        <DataRefreshScreen
          onClose={() => setShowDataRefresh(false)}
          isRunning={isRefreshing}
          isDone={refreshDone}
          error={refreshError}
          storeProgress={storeProgress}
          onTrigger={handleTriggerRefresh}
          dealStatus={dealStatus}
          onStatusRefetch={refetchDealStatus}
        />
      )}

      <Header
        onNavigateAccount={() => setTab('account')}
        onAppDownload={() => setShowAppDownload(true)}
        onSettingsClick={() => setTab('instellingen')}
        onDataRefreshClick={handleOpenDataRefresh}
        dealStatus={dealStatus}
        isRefreshing={isRefreshing}
      />

      <main className="flex-1 overflow-y-auto w-full">
        <div className="mx-auto max-w-2xl p-4 pb-28">
          {tab === 'home' && <HomeTab onNavigate={setTab} />}
          {tab === 'recepten' && (
            <RecipeTab
              isGenerating={isGenerating}
              statusLines={statusLines}
              recipes={recipes}
              error={error}
              onGenerate={generate}
              onOpen={setDetail}
              hasDataToday={dealStatus?.hasDataToday ?? false}
              onOpenDataRefresh={handleOpenDataRefresh}
            />
          )}
          {tab === 'tracker' && <TrackerTab />}
          {tab === 'instellingen' && <SettingsPage />}
          {tab === 'account' && <AccountPage />}
        </div>
      </main>

      <BottomNav active={tab} onChange={setTab} />

      {detail && (
        <RecipeDetail
          recipe={detail}
          onClose={() => setDetail(null)}
        />
      )}

      <UpdateBanner visible={updateAvailable} onRefresh={refresh} />
    </div>
  );
}
