'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth-context';
import type { DealStatus } from '@/lib/api';

interface HeaderProps {
  onNavigateAccount?: () => void;
  onAppDownload?: () => void;
  onSettingsClick?: () => void;
  onDataRefreshClick?: () => void;
  dealStatus?: DealStatus | null;
  isRefreshing?: boolean;
}

function DataStatusDot({ status, isRefreshing }: { status: DealStatus | null | undefined; isRefreshing: boolean }) {
  if (isRefreshing) return null; // spinner op de knop zelf is genoeg

  if (!status) return null;

  const hasDataToday = status.hasDataToday;
  const hasStaleData = !hasDataToday && status.stores.length > 0;

  if (hasDataToday) {
    return (
      <span
        className="absolute top-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-surface bg-success"
        aria-hidden="true"
      />
    );
  }
  if (hasStaleData) {
    return (
      <span
        className="absolute top-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-surface bg-kortingOrange"
        aria-hidden="true"
      />
    );
  }
  // Nog nooit data → grijze stip
  return (
    <span
      className="absolute top-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-surface bg-muted"
      aria-hidden="true"
    />
  );
}

export function Header({
  onNavigateAccount,
  onAppDownload,
  onSettingsClick,
  onDataRefreshClick,
  dealStatus,
  isRefreshing,
}: HeaderProps) {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const initial = user?.email?.charAt(0).toUpperCase() ?? '?';
  const avatarUrl = (user?.user_metadata?.avatar_url as string | null) ?? null;

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <header className="shrink-0 sticky top-0 z-30 flex items-center justify-between border-b border-line bg-surface px-4 py-3">
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-tile bg-ahBlue text-onPrimary">
          <i className="ph-fill ph-cooking-pot text-lg" aria-hidden="true" />
        </span>
        <span className="font-heading text-lg font-extrabold tracking-tight text-navy">
          FamApp
        </span>
      </div>

      <div className="flex items-center gap-1">
        {/* Data-status knop */}
        <button
          type="button"
          onClick={onDataRefreshClick}
          aria-label="Aanbiedingen data"
          className="relative flex h-9 w-9 items-center justify-center rounded-tile text-muted transition-colors hover:bg-line hover:text-navy"
        >
          {isRefreshing ? (
            <i className="ph ph-circle-notch animate-spin text-xl text-ahBlue" aria-hidden="true" />
          ) : (
            <i className="ph ph-database text-xl" aria-hidden="true" />
          )}
          <DataStatusDot status={dealStatus} isRefreshing={!!isRefreshing} />
        </button>

        <button
          type="button"
          onClick={onSettingsClick}
          aria-label="Instellingen"
          className="flex h-9 w-9 items-center justify-center rounded-tile text-muted transition-colors hover:bg-line hover:text-navy"
        >
          <i className="ph ph-sliders-horizontal text-xl" aria-hidden="true" />
        </button>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="Account menu"
            className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-ahBlueSoft text-ahBlue text-sm font-bold transition-colors hover:ring-2 hover:ring-ahBlue"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="Profielfoto" className="h-full w-full object-cover" />
            ) : (
              initial
            )}
          </button>

          {open && (
            <div className="absolute right-0 mt-2 w-52 rounded-card border border-line bg-surface py-1 shadow-card">
              <button
                type="button"
                onClick={() => { setOpen(false); onNavigateAccount?.(); }}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-ink hover:bg-appBg"
              >
                <i className="ph ph-user-circle text-base text-muted" aria-hidden="true" />
                Account instellingen
              </button>
              <button
                type="button"
                onClick={() => { setOpen(false); onAppDownload?.(); }}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-ink hover:bg-appBg"
              >
                <i className="ph ph-device-mobile text-base text-muted" aria-hidden="true" />
                App downloaden
              </button>
              <hr className="my-1 border-line" />
              <button
                type="button"
                onClick={() => { setOpen(false); signOut(); }}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-ink hover:bg-appBg"
              >
                <i className="ph ph-sign-out text-base text-muted" aria-hidden="true" />
                Uitloggen
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
