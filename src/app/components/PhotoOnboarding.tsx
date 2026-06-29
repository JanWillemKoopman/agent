'use client';

import { useState } from 'react';
import { useAuth } from '../auth-context';
import { AvatarUpload } from './AvatarUpload';
import { uploadAvatar, saveAvatarUrl } from '@/lib/supabase/storage';

interface PhotoOnboardingProps {
  onDone: () => void;
}

export function PhotoOnboarding({ onDone }: PhotoOnboardingProps) {
  const { user } = useAuth();
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initial = user?.email?.charAt(0).toUpperCase() ?? '?';

  const handleSave = async () => {
    if (!pendingFile || !user) return;
    setBusy(true);
    setError(null);
    try {
      const url = await uploadAvatar(user.id, pendingFile);
      await saveAvatarUrl(url);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Uploaden mislukt. Probeer het opnieuw.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-appBg px-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-ahBlue text-white shadow-card">
            <i className="ph-fill ph-cooking-pot text-3xl" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-navy">
            Welkom bij FamApp!
          </h1>
          <p className="text-center text-sm text-muted">
            Voeg een profielfoto toe zodat we weten wie er kookt.
          </p>
        </div>

        <div className="rounded-card bg-surface p-6 shadow-card">
          <AvatarUpload
            currentUrl={null}
            initial={initial}
            onFileSelected={setPendingFile}
          />

          {error && (
            <p className="mt-4 rounded-card bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={!pendingFile || busy}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-pill bg-ahBlue py-3 text-sm font-semibold text-white transition-colors hover:bg-ahBlueDark disabled:opacity-60"
          >
            {busy ? (
              <>
                <i className="ph ph-circle-notch animate-spin text-base" aria-hidden="true" />
                Uploaden…
              </>
            ) : (
              <>
                <i className="ph-fill ph-check text-base" aria-hidden="true" />
                Foto opslaan
              </>
            )}
          </button>
        </div>

        <button
          type="button"
          onClick={onDone}
          className="mt-4 w-full text-center text-xs text-muted transition-colors hover:text-ink"
        >
          Overslaan, ik doe dit later
        </button>
      </div>
    </div>
  );
}
