'use client';

interface HeaderProps {
  onOpenSettings: () => void;
}

export function Header({ onOpenSettings }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-gray-200 bg-surface px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="text-xl font-bold text-ahBlue">Slimme Recepten</span>
      </div>
      <button
        type="button"
        aria-label="Instellingen"
        onClick={onOpenSettings}
        className="flex h-10 w-10 items-center justify-center rounded-pill text-dark transition-colors hover:bg-appBg"
      >
        <i className="ph ph-gear text-2xl" aria-hidden="true" />
      </button>
    </header>
  );
}
