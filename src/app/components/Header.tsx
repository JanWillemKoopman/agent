'use client';

export function Header() {
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
    </header>
  );
}
