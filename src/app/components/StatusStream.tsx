'use client';

interface StatusStreamProps {
  lines: { step: number; message: string }[];
  isGenerating: boolean;
}

export function StatusStream({ lines, isGenerating }: StatusStreamProps) {
  if (lines.length === 0 && !isGenerating) return null;

  return (
    <div className="rounded-card bg-surface p-4 shadow-card" aria-live="polite">
      <ul className="space-y-2">
        {lines.map((line, idx) => {
          const isLast = idx === lines.length - 1;
          const active = isGenerating && isLast;
          return (
            <li
              key={`${line.step}-${idx}`}
              className={`flex items-center gap-2 text-sm ${
                active ? 'font-semibold text-dark' : 'text-gray-500'
              }`}
            >
              {active ? (
                <i className="ph ph-circle-notch animate-spin text-ahBlue" aria-hidden="true" />
              ) : (
                <i className="ph ph-check-circle text-ahBlue" aria-hidden="true" />
              )}
              {line.message}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
