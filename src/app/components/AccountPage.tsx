'use client';

import { useState } from 'react';
import { useAuth } from '../auth-context';
import { AvatarUpload } from './AvatarUpload';
import { uploadAvatar, saveAvatarUrl } from '@/lib/supabase/storage';

export function AccountPage() {
  const { user, signOut } = useAuth();
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initial = user?.email?.charAt(0).toUpperCase() ?? '?';
  const currentAvatarUrl = (user?.user_metadata?.avatar_url as string | null) ?? null;

  const handleFileSelected = (file: File) => {
    setPendingFile(file);
    setSavedOk(false);
    setError(null);
  };

  const handleSavePhoto = async () => {
    if (!pendingFile || !user) return;
    setSaving(true);
    setError(null);
    setSavedOk(false);
    try {
      const url = await uploadAvatar(user.id, pendingFile);
      await saveAvatarUrl(url);
      setPendingFile(null);
      setSavedOk(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Uploaden mislukt. Probeer het opnieuw.');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className="space-y-5">
      <h1 className="px-1 font-heading text-xl font-extrabold text-navy">Account</h1>

      {/* Profielfoto */}
      <section className="space-y-4 rounded-card bg-surface p-4 shadow-card">
        <h2 className="text-sm font-semibold text-ink">Profielfoto</h2>

        <AvatarUpload
          currentUrl={currentAvatarUrl}
          initial={initial}
          onFileSelected={handleFileSelected}
        />

        {error && (
          <p className="rounded-card bg-dangerSoft px-3 py-2 text-sm text-dangerInk">{error}</p>
        )}
        {savedOk && (
          <p className="flex items-center gap-1.5 text-sm text-ahBlueDark">
            <i className="ph-fill ph-check-circle" aria-hidden="true" />
            Profielfoto opgeslagen.
          </p>
        )}

        <button
          type="button"
          onClick={handleSavePhoto}
          disabled={!pendingFile || saving}
          className="flex w-full items-center justify-center gap-2 rounded-pill bg-ahBlue py-3 text-sm font-semibold text-onPrimary transition-colors hover:bg-ahBlueDark disabled:opacity-60"
        >
          {saving ? (
            <>
              <i className="ph ph-circle-notch animate-spin text-base" aria-hidden="true" />
              Uploaden…
            </>
          ) : (
            'Foto opslaan'
          )}
        </button>
      </section>

      {/* Accountgegevens */}
      <section className="flex items-center gap-3 rounded-card bg-surface p-4 shadow-card">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ahBlueSoft text-ahBlue">
          <i className="ph-fill ph-envelope text-lg" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-xs text-muted">Ingelogd als</p>
          <p className="truncate text-sm font-semibold text-ink">
            {user?.email ?? 'Onbekend'}
          </p>
        </div>
      </section>

      {/* Uitloggen */}
      <button
        type="button"
        onClick={handleSignOut}
        disabled={signingOut}
        className="flex w-full items-center justify-center gap-2 rounded-pill border border-line bg-surface py-3 text-sm font-semibold text-ink transition-colors hover:bg-appBg disabled:opacity-60"
      >
        <i className="ph ph-sign-out text-lg" aria-hidden="true" />
        {signingOut ? 'Uitloggen…' : 'Uitloggen'}
      </button>
    </div>
  );
}
