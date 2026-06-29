'use client';

interface StatusStreamProps {
  lines: { step: number; message: string }[];
  isGenerating: boolean;
}

// Cleane Phosphor-icoontjes per pipeline-stap.
const STEP_ICONS: Record<number, string> = {
  1: 'ph-magnifying-glass',
  2: 'ph-cooking-pot',
  3: 'ph-seal-check',
  4: 'ph-shopping-cart-simple',
  5: 'ph-calculator',
};

export function StatusStream({ lines, isGenerating }: StatusStreamProps) {
  if (lines.length === 0 && !isGenerating) return null;

  return (
    <div className="rounded-card bg-surface p-4 shadow-card" aria-live="polite">
      <ul className="space-y-3">
        {lines.map((line, idx) => {
          const isLast = idx === lines.length - 1;
          const active = isGenerating && isLast;
          const done = !active;
          return (
            <li
              key={`${line.step}-${idx}`}
              className="flex items-center gap-3 text-sm"
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  done
                    ? 'bg-ahBlueSoft text-ahBlue'
                    : 'bg-ahBlue text-white'
                }`}
              >
                {active ? (
                  <i
                    className="ph ph-circle-notch animate-spin text-base"
                    aria-hidden="true"
                  />
                ) : (
                  <i
                    className={`ph ${STEP_ICONS[line.step] ?? 'ph-check'} text-base`}
                    aria-hidden="true"
                  />
                )}
              </span>
              <span
                className={
                  active ? 'font-semibold text-ink' : 'text-muted'
                }
              >
                {line.message}
              </span>
              {done && (
                <i
                  className="ph-fill ph-check-circle ml-auto text-ahBlue"
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
