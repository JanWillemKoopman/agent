'use client';

interface StatusStreamProps {
  lines: { step: number; message: string }[];
  isGenerating: boolean;
}

// Lokale chef-definitie — moet overeenkomen met CHEF_PERSONAS in agents.ts
const CHEFS = [
  { id: 'Chef Snel',         icon: 'ph-lightning',   specialty: 'Snel & gezond' },
  { id: 'Chef Vega',         icon: 'ph-leaf',         specialty: 'Vegetarisch' },
  { id: 'Chef Wereldkeuken', icon: 'ph-globe',        specialty: 'Wereldkeuken' },
  { id: 'Chef Gezond',       icon: 'ph-heartbeat',    specialty: 'Macro-balanced' },
  { id: 'Chef Budget',       icon: 'ph-piggy-bank',   specialty: 'Ultra budget' },
  { id: 'Chef Familie',      icon: 'ph-users-three',  specialty: 'Gezinsvriendelijk' },
  { id: 'Chef Gourmet',      icon: 'ph-star',         specialty: 'Gourmet' },
  { id: 'Chef Slow',         icon: 'ph-timer',        specialty: 'Oven & slowcooker' },
];

const STEP_ICONS: Record<number, string> = {
  1: 'ph-magnifying-glass',
  2: 'ph-cooking-pot',
  3: 'ph-seal-check',
  4: 'ph-shopping-cart-simple',
  5: 'ph-calculator',
};

function parseChefDone(message: string): { chefId: string; count: number } | null {
  if (!message.startsWith('chef_done:')) return null;
  const rest = message.slice('chef_done:'.length);
  const lastColon = rest.lastIndexOf(':');
  if (lastColon === -1) return null;
  const chefId = rest.slice(0, lastColon);
  const count = parseInt(rest.slice(lastColon + 1), 10);
  return { chefId, count: isNaN(count) ? 0 : count };
}

function StepRow({
  icon,
  message,
  active,
}: {
  icon: string;
  message: string;
  active: boolean;
}) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          active ? 'bg-ahBlue text-onPrimary' : 'bg-ahBlueSoft text-ahBlue'
        }`}
      >
        {active ? (
          <i className="ph ph-circle-notch animate-spin text-base" aria-hidden="true" />
        ) : (
          <i className={`ph ${icon} text-base`} aria-hidden="true" />
        )}
      </span>
      <span className={active ? 'font-semibold text-ink' : 'text-muted'}>
        {message}
      </span>
      {!active && (
        <i className="ph-fill ph-check-circle ml-auto text-ahBlue" aria-hidden="true" />
      )}
    </div>
  );
}

export function StatusStream({ lines, isGenerating }: StatusStreamProps) {
  if (lines.length === 0 && !isGenerating) return null;

  // Parseer chef-voltooiingen en reguliere stap-regels
  const chefDoneMap: Record<string, number> = {};
  const regularLines: { step: number; message: string }[] = [];
  let step2Header: string | undefined;

  for (const line of lines) {
    if (line.step === 2) {
      if (line.message.startsWith('chef_done:')) {
        const parsed = parseChefDone(line.message);
        if (parsed) chefDoneMap[parsed.chefId] = parsed.count;
      } else {
        step2Header = line.message;
      }
    } else {
      regularLines.push(line);
    }
  }

  const beforeStep2 = regularLines.filter((l) => l.step < 2);
  const afterStep2 = regularLines.filter((l) => l.step > 2);
  const highestStep = lines.length > 0 ? Math.max(...lines.map((l) => l.step)) : 0;
  const step2Active = isGenerating && highestStep === 2;
  const step2Done = highestStep > 2 || (!isGenerating && highestStep >= 2);
  const hasStep2 = step2Header !== undefined || Object.keys(chefDoneMap).length > 0;
  const totalDone = Object.keys(chefDoneMap).length;
  const totalRecipes = Object.values(chefDoneMap).reduce((s, n) => s + n, 0);

  return (
    <div className="rounded-card bg-surface p-4 shadow-card space-y-4" aria-live="polite">
      {/* Stap 1 en eventuele stappen vóór stap 2 */}
      {beforeStep2.map((line, idx) => (
        <StepRow
          key={idx}
          icon={STEP_ICONS[line.step] ?? 'ph-check'}
          message={line.message}
          active={false}
        />
      ))}

      {/* Keukenbrigade — stap 2 */}
      {hasStep2 && (
        <div className="space-y-3">
          {/* Brigade-header */}
          <div className="flex items-center gap-3 text-sm">
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                step2Done
                  ? 'bg-ahBlueSoft text-ahBlue'
                  : step2Active
                  ? 'bg-ahBlue text-onPrimary'
                  : 'bg-gray-100 text-muted'
              }`}
            >
              {step2Active ? (
                <i className="ph ph-circle-notch animate-spin text-base" aria-hidden="true" />
              ) : (
                <i className="ph ph-cooking-pot text-base" aria-hidden="true" />
              )}
            </span>
            <span className={step2Active ? 'font-semibold text-ink' : 'text-muted'}>
              {step2Header ?? 'Keukenbrigade aan het werk…'}
            </span>
            {step2Done && (
              <i className="ph-fill ph-check-circle ml-auto text-ahBlue" aria-hidden="true" />
            )}
          </div>

          {/* Samenvatting als stap 2 klaar is */}
          {step2Done && totalRecipes > 0 && (
            <p className="ml-11 text-xs text-muted">
              {totalDone} chefs bedachten samen {totalRecipes} receptideeën
            </p>
          )}

          {/* Chef-kaartjes: toon tijdens stap 2 én als chefs al rapporteren */}
          {(step2Active || totalDone > 0) && (
            <div className="grid grid-cols-2 gap-2 pl-11">
              {CHEFS.map((chef) => {
                const isDone = chef.id in chefDoneMap;
                const count = chefDoneMap[chef.id] ?? 0;
                return (
                  <div
                    key={chef.id}
                    className={`flex items-center gap-2 rounded-card px-2.5 py-2 text-xs transition-colors ${
                      isDone
                        ? 'bg-ahBlueSoft border border-ahBlue/20'
                        : step2Active
                        ? 'bg-surface border border-line'
                        : 'bg-surface border border-line opacity-40'
                    }`}
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                        isDone ? 'bg-ahBlue text-onPrimary' : 'bg-gray-100 text-muted'
                      }`}
                    >
                      {!isDone && step2Active ? (
                        <i
                          className="ph ph-circle-notch animate-spin text-[10px]"
                          aria-hidden="true"
                        />
                      ) : (
                        <i className={`ph ${chef.icon} text-[10px]`} aria-hidden="true" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div
                        className={`font-medium leading-tight truncate ${
                          isDone ? 'text-ink' : 'text-muted'
                        }`}
                      >
                        {chef.id}
                      </div>
                      <div className={isDone ? 'text-ahBlue' : 'text-muted'}>
                        {isDone
                          ? `${count} recepten`
                          : step2Active
                          ? 'Aan het koken…'
                          : chef.specialty}
                      </div>
                    </div>
                    {isDone && (
                      <i
                        className="ph-fill ph-check-circle shrink-0 text-ahBlue"
                        aria-hidden="true"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Stappen ná de brigade (3, 4, 5) */}
      {afterStep2.map((line, idx) => {
        const isLast = idx === afterStep2.length - 1;
        const active = isGenerating && isLast;
        return (
          <StepRow
            key={`after-${idx}`}
            icon={STEP_ICONS[line.step] ?? 'ph-check'}
            message={line.message}
            active={active}
          />
        );
      })}
    </div>
  );
}
