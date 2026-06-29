'use client';

interface UpdateBannerProps {
  visible: boolean;
  onRefresh: () => void;
}

export function UpdateBanner({ visible, onRefresh }: UpdateBannerProps) {
  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-between gap-3 bg-dark px-4 py-3 text-sm text-white">
      <span className="flex items-center gap-2">
        <i className="ph ph-arrows-clockwise text-lg" aria-hidden="true" />
        Update beschikbaar
      </span>
      <button
        type="button"
        onClick={onRefresh}
        className="rounded-pill bg-ahBlue px-4 py-1.5 font-semibold text-white hover:brightness-95"
      >
        Verversen
      </button>
    </div>
  );
}
