'use client';

interface UpdateBannerProps {
  visible: boolean;
  onRefresh: () => void;
}

export function UpdateBanner({ visible, onRefresh }: UpdateBannerProps) {
  if (!visible) return null;

  return (
    <div
      className="fixed inset-x-0 z-50 px-4"
      style={{ bottom: 'calc(4.5rem + env(safe-area-inset-bottom))' }}
    >
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 rounded-card bg-navy px-4 py-3 text-sm text-white shadow-card">
        <span className="flex items-center gap-2">
          <i className="ph ph-arrows-clockwise text-lg" aria-hidden="true" />
          Nieuwe versie beschikbaar
        </span>
        <button
          type="button"
          onClick={onRefresh}
          className="rounded-pill bg-ahBlue px-4 py-1.5 font-semibold text-white transition-colors hover:bg-ahBlueDark"
        >
          Verversen
        </button>
      </div>
    </div>
  );
}
