'use client';

interface GenerateButtonProps {
  onClick: () => void;
  isGenerating: boolean;
}

export function GenerateButton({ onClick, isGenerating }: GenerateButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isGenerating}
      className="flex w-full items-center justify-center gap-2 rounded-pill bg-ahBlue px-6 py-4 text-base font-semibold text-white shadow-card transition-colors hover:bg-ahBlueDark disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isGenerating ? (
        <>
          <i
            className="ph ph-circle-notch animate-spin text-xl"
            aria-hidden="true"
          />
          Bezig met koken...
        </>
      ) : (
        <>
          <i className="ph-fill ph-sparkle text-xl" aria-hidden="true" />
          Genereer goedkope recepten
        </>
      )}
    </button>
  );
}
