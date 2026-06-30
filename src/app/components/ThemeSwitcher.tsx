'use client';

import { useTheme } from '@/lib/theme/ThemeProvider';
import { THEMES, type ThemeId } from '@/lib/theme/themes';

/**
 * "Template selectie" — de visuele thema-kiezer onderaan Instellingen.
 *
 * Bevat (1) een raster met merk-kaarten die de kleur- en geometrie-identiteit
 * van elke supermarkt tonen en (2) een live-preview die direct met het
 * geselecteerde thema meebeweegt. Een keuze wordt meteen globaal toegepast
 * (via de ThemeProvider → LocalStorage), zonder page-reload.
 */
export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <section className="space-y-4 rounded-card bg-surface p-4 shadow-card">
      <div className="space-y-1">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <i className="ph-fill ph-palette text-base text-ahBlue" aria-hidden="true" />
          Template selectie
        </h2>
        <p className="text-xs text-muted">
          Kies een supermarkt-identiteit. De hele app neemt direct de kleuren,
          typografie en vormgeving van dat merk over.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {THEMES.map((t) => (
          <ThemeCard
            key={t.id}
            theme={t.id}
            active={theme === t.id}
            onSelect={() => setTheme(t.id)}
          />
        ))}
      </div>

      <LivePreview themeId={theme} />
    </section>
  );
}

// --- Merk-keuzekaart ---------------------------------------------------------

function ThemeCard({
  theme,
  active,
  onSelect,
}: {
  theme: ThemeId;
  active: boolean;
  onSelect: () => void;
}) {
  const meta = THEMES.find((t) => t.id === theme)!;
  const { swatches, radius } = meta;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={`group relative flex flex-col gap-2.5 border p-3 text-left transition-all active:scale-[0.98] ${
        active
          ? 'border-ahBlue ring-2 ring-ahBlue/40'
          : 'border-line hover:border-ahBlue/50'
      }`}
      style={{ borderRadius: 'var(--r-card)' }}
    >
      {active && (
        <span
          className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-ahBlue text-onPrimary"
          aria-hidden="true"
        >
          <i className="ph-fill ph-check text-[11px]" />
        </span>
      )}

      {/* Mini-mockup: surface met een primair vlak, accent-badge en tekstregels.
          Gebruikt de echte swatches zodat de kaart de merk-identiteit toont. */}
      <div
        className="flex h-20 flex-col justify-between overflow-hidden border p-2"
        style={{
          backgroundColor: swatches.surface,
          borderColor: 'rgb(0 0 0 / 0.06)',
          borderRadius: radius,
        }}
      >
        <div className="flex items-center gap-1.5">
          <span
            className="h-4 w-4 shrink-0"
            style={{ backgroundColor: swatches.primary, borderRadius: radius / 2 }}
          />
          <span
            className="h-1.5 flex-1 rounded-full"
            style={{ backgroundColor: swatches.heading, opacity: 0.85 }}
          />
        </div>
        <div className="space-y-1">
          <span
            className="block h-1.5 w-3/4 rounded-full"
            style={{ backgroundColor: swatches.heading, opacity: 0.25 }}
          />
          <div className="flex items-center justify-between">
            <span
              className="inline-block h-3 w-9"
              style={{
                backgroundColor: swatches.accent,
                borderRadius: Math.max(2, radius / 2.5),
              }}
            />
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ backgroundColor: swatches.primary }}
            />
          </div>
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold text-ink">{meta.name}</p>
        <p className="mt-0.5 text-[11px] leading-snug text-muted">{meta.typography}</p>
      </div>
    </button>
  );
}

// --- Live preview ------------------------------------------------------------

function LivePreview({ themeId }: { themeId: ThemeId }) {
  const meta = THEMES.find((t) => t.id === themeId)!;

  // De preview krijgt zélf het `data-theme`-attribuut, zodat alle tokens binnen
  // dit vlak meteen overschreven worden — een natuurgetrouwe weergave van de
  // gekozen sjabloon, ongeacht het globaal toegepaste thema.
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
        Live preview
      </p>
      <div
        data-theme={themeId}
        className="space-y-3 rounded-card border border-line bg-appBg p-4 shadow-card"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-badge bg-kortingOrange px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-onAccent">
            <i className="ph-fill ph-tag text-xs" aria-hidden="true" />
            2e gratis
          </span>
          <span className="inline-flex items-center gap-1 rounded-badge bg-ahBlueSoft px-2 py-0.5 text-[11px] font-semibold text-ahBlue">
            <i className="ph-fill ph-check-circle text-xs" aria-hidden="true" />
            {meta.name}
          </span>
        </div>

        <div className="rounded-card bg-surface p-3 shadow-card">
          <h3 className="font-heading text-lg font-extrabold text-navy">
            Vandaag in de bonus
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            Verse seizoensgroenten, slim geprijsd. Zo kook je gezond én
            voordelig met de aanbiedingen van deze week.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-pill bg-ahBlue px-4 py-2 text-xs font-semibold text-onPrimary transition-colors hover:bg-ahBlueDark active:scale-[0.98]"
            >
              <i className="ph-fill ph-sparkle text-sm" aria-hidden="true" />
              Bekijk recept
            </button>
            <span className="text-sm font-extrabold text-ink">€ 1,75</span>
            <span className="text-xs text-muted line-through">€ 2,49</span>
          </div>
        </div>
      </div>
    </div>
  );
}
