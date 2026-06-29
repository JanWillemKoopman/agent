'use client';

interface InstallBannerProps {
  onDismiss: () => void;
  onInstall: () => void;
}

export function InstallBanner({ onDismiss, onInstall }: InstallBannerProps) {
  return (
    <div className="fixed inset-x-0 top-0 z-40 flex items-center justify-between gap-2 bg-ahBlue px-4 py-2 text-white shadow-card">
      <div className="flex min-w-0 items-center gap-2">
        <i className="ph-fill ph-device-mobile shrink-0 text-lg" aria-hidden="true" />
        <span className="truncate text-xs font-medium">
          Installeer FamApp voor de beste ervaring
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={onInstall}
          className="rounded-pill bg-white px-3 py-1 text-xs font-semibold text-ahBlue transition-colors hover:bg-ahBlueSoft"
        >
          Hoe?
        </button>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Banner sluiten"
          className="flex h-7 w-7 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/20"
        >
          <i className="ph ph-x text-base" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
