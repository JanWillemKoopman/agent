'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth-context';

interface HeaderProps {
  onNavigateAccount?: () => void;
}

export function Header({ onNavigateAccount }: HeaderProps) {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const initial = user?.email?.charAt(0).toUpperCase() ?? '?';

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
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-surface px-4 py-3">
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ahBlue text-white">
          <i className="ph-fill ph-cooking-pot text-lg" aria-hidden="true" />
        </span>
        <span className="text-lg font-extrabold tracking-tight text-navy">
          FamApp
        </span>
      </div>

      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Account menu"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-ahBlueSoft text-ahBlue text-sm font-bold transition-colors hover:bg-ahBlue hover:text-white"
        >
          {initial}
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-48 rounded-card border border-line bg-surface py-1 shadow-card">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onNavigateAccount?.();
              }}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-ink hover:bg-appBg"
            >
              <i className="ph ph-user-circle text-base text-muted" aria-hidden="true" />
              Account instellingen
            </button>
            <hr className="my-1 border-line" />
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                signOut();
              }}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-ink hover:bg-appBg"
            >
              <i className="ph ph-sign-out text-base text-muted" aria-hidden="true" />
              Uitloggen
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
