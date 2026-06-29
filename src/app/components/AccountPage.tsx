'use client';

import { useState } from 'react';
import { useAuth } from '../auth-context';

export function AccountPage() {
  const { user, signOut } = useAuth();
  const [busy, setBusy] = useState(false);

  const handleSignOut = async () => {
    setBusy(true);
    try {
      await signOut();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <h1 className="px-1 text-xl font-extrabold text-navy">Account</h1>

      <section className="flex items-center gap-3 rounded-card bg-surface p-4 shadow-card">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ahBlueSoft text-ahBlue">
          <i className="ph-fill ph-user text-2xl" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-xs text-muted">Ingelogd als</p>
          <p className="truncate text-sm font-semibold text-ink">
            {user?.email ?? 'Onbekend'}
          </p>
        </div>
      </section>

      <button
        type="button"
        onClick={handleSignOut}
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-pill border border-line bg-surface py-3 text-sm font-semibold text-ink transition-colors hover:bg-appBg disabled:opacity-60"
      >
        <i className="ph ph-sign-out text-lg" aria-hidden="true" />
        {busy ? 'Uitloggen…' : 'Uitloggen'}
      </button>
    </div>
  );
}
