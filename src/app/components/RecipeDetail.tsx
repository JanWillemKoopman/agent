'use client';

import { forwardRef, useEffect, useRef, useState } from 'react';
import type { FinalRecipe, PricedIngredient } from '@/lib/types';
import { formatEuro } from '@/lib/format';

interface RecipeDetailProps {
  recipe: FinalRecipe;
  onClose: () => void;
}

export function RecipeDetail({ recipe, onClose }: RecipeDetailProps) {
  const [sharing, setSharing] = useState(false);
  const shareCardRef = useRef<HTMLDivElement>(null);

  const servings = recipe.servings || 4;
  const instructions = recipe.instructions ?? [];
  const priceIncomplete = recipe.price_complete === false;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const handleShare = async () => {
    if (!shareCardRef.current) return;
    setSharing(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(shareCardRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#f5f6f7',
        logging: false,
      });

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => {
          if (b) resolve(b);
          else reject(new Error('Canvas toBlob mislukt'));
        }, 'image/png');
      });

      const file = new File([blob], `${recipe.recipe_name}.png`, { type: 'image/png' });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: recipe.recipe_name });
      } else {
        // Fallback: download de afbeelding
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${recipe.recipe_name}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        console.error('Delen mislukt:', e);
      }
    } finally {
      setSharing(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-appBg">
        {/* Topbalk */}
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-surface px-3 py-3">
          <button
            type="button"
            aria-label="Terug"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full text-ink transition-colors hover:bg-appBg"
          >
            <i className="ph ph-arrow-left text-2xl" aria-hidden="true" />
          </button>
          <span className="text-sm font-semibold text-navy">Recept</span>
          <div className="h-10 w-10" />
        </header>

        <main className="mx-auto max-w-2xl space-y-5 p-4 pb-28">
          {/* Titel + omschrijving */}
          <section className="space-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {recipe.korting_deal_count > 0 && (
                <span className="inline-flex items-center gap-1 rounded-md bg-kortingOrange px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
                  <i className="ph-fill ph-tag text-xs" aria-hidden="true" />
                  {recipe.korting_deal_count}x korting
                </span>
              )}
              <span className="inline-flex items-center gap-1 rounded-md bg-appBg px-2 py-0.5 text-[11px] font-medium text-muted">
                <i className="ph ph-users-three text-xs" aria-hidden="true" />
                {servings} personen
              </span>
            </div>
            <h1 className="text-2xl font-extrabold leading-tight text-navy">
              {recipe.recipe_name}
            </h1>
            <p className="text-sm text-muted">{recipe.description}</p>
          </section>

          {/* Prijs-samenvatting */}
          <section className="space-y-2">
            <div className="flex items-stretch gap-3">
              <div className="flex-1 rounded-card bg-surface p-4 text-center shadow-card">
                <p className="text-xs text-muted">Per persoon</p>
                <p className="text-xl font-extrabold text-ink">
                  {priceIncomplete ? '± ' : ''}
                  {formatEuro(recipe.price_per_person)}
                </p>
              </div>
              <div className="flex-1 rounded-card bg-surface p-4 text-center shadow-card">
                <p className="text-xs text-muted">Totaal ({servings} pers.)</p>
                <p className="text-xl font-extrabold text-ink">
                  {priceIncomplete ? '± ' : ''}
                  {formatEuro(recipe.total_price)}
                </p>
              </div>
            </div>
            {priceIncomplete && (
              <p className="flex items-start gap-1.5 px-1 text-[11px] leading-snug text-muted">
                <i className="ph ph-info mt-0.5 shrink-0 text-amber-500" aria-hidden="true" />
                Richtprijs — van één of meer ingrediënten kon de prijs niet worden
                opgehaald (zie "n.t.b." hieronder).
              </p>
            )}
          </section>

          {/* Ingrediënten-tabel */}
          <section className="space-y-2">
            <h2 className="px-1 text-lg font-bold text-navy">Ingrediënten</h2>
            <div className="overflow-hidden rounded-card bg-surface shadow-card">
              <div className="flex items-center justify-between border-b border-line px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
                <span>Ingrediënt</span>
                <span>Prijs</span>
              </div>
              <ul className="divide-y divide-line">
                {recipe.ingredients.map((ing, idx) => (
                  <IngredientRow key={`${ing.name}-${idx}`} ing={ing} />
                ))}
              </ul>
            </div>
          </section>

          {/* Bereiding */}
          {instructions.length > 0 && (
            <section className="space-y-2">
              <h2 className="px-1 text-lg font-bold text-navy">Aan de slag</h2>
              <ol className="space-y-3 rounded-card bg-surface p-4 shadow-card">
                {instructions.map((step, idx) => (
                  <li key={idx} className="flex gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ahBlueSoft text-sm font-bold text-ahBlue">
                      {idx + 1}
                    </span>
                    <p className="pt-0.5 text-sm leading-relaxed text-ink">
                      {step}
                    </p>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </main>

        {/* Sticky deel-knop onderaan */}
        <div
          className="fixed inset-x-0 bottom-0 border-t border-line bg-surface p-3"
          style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
        >
          <div className="mx-auto max-w-2xl">
            <button
              type="button"
              onClick={handleShare}
              disabled={sharing}
              className="flex w-full items-center justify-center gap-2 rounded-pill py-3 text-sm font-semibold transition-colors disabled:opacity-70"
              style={{ backgroundColor: '#25D366', color: 'white' }}
            >
              {sharing ? (
                <i className="ph ph-circle-notch animate-spin text-lg" aria-hidden="true" />
              ) : (
                <WhatsAppIcon />
              )}
              {sharing ? 'Even geduld...' : 'Recept delen'}
            </button>
          </div>
        </div>
      </div>

      {/* Verborgen share card voor html2canvas */}
      <div style={{ position: 'fixed', left: '-9999px', top: 0, zIndex: -1 }}>
        <ShareCard ref={shareCardRef} recipe={recipe} />
      </div>
    </>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

const ShareCard = forwardRef<HTMLDivElement, { recipe: FinalRecipe }>(({ recipe }, ref) => {
  const servings = recipe.servings || 4;
  const instructions = recipe.instructions ?? [];
  const priceIncomplete = recipe.price_complete === false;

  return (
    <div
      ref={ref}
      style={{
        width: '390px',
        fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
        backgroundColor: '#f5f6f7',
        color: '#1a1a1a',
        paddingBottom: '4px',
      }}
    >
      {/* Blauwe header */}
      <div
        style={{
          background: 'linear-gradient(135deg, #00a0e2 0%, #0089c3 100%)',
          padding: '24px 24px 28px',
          color: 'white',
        }}
      >
        {/* Branding */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: 'rgba(255,255,255,0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
            }}
          >
            🍳
          </div>
          <span style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '-0.3px' }}>FamApp</span>
        </div>

        {/* Badges */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
          {recipe.korting_deal_count > 0 && (
            <span
              style={{
                backgroundColor: '#f28e00',
                color: 'white',
                padding: '3px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              ★ {recipe.korting_deal_count}x korting
            </span>
          )}
          <span
            style={{
              backgroundColor: 'rgba(255,255,255,0.2)',
              color: 'white',
              padding: '3px 8px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 600,
            }}
          >
            {servings} personen
          </span>
        </div>

        {/* Titel */}
        <h1
          style={{
            fontSize: '26px',
            fontWeight: 800,
            lineHeight: 1.2,
            margin: '0 0 8px',
            letterSpacing: '-0.5px',
          }}
        >
          {recipe.recipe_name}
        </h1>

        {/* Omschrijving */}
        <p
          style={{
            fontSize: '14px',
            color: 'rgba(255,255,255,0.85)',
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          {recipe.description}
        </p>
      </div>

      {/* Prijzen */}
      <div style={{ padding: '20px 20px 0', display: 'flex', gap: '12px' }}>
        <div
          style={{
            flex: 1,
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '14px',
            textAlign: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}
        >
          <p style={{ fontSize: '11px', color: '#6b7785', margin: '0 0 4px' }}>Per persoon</p>
          <p style={{ fontSize: '22px', fontWeight: 800, color: '#1a1a1a', margin: 0 }}>
            {priceIncomplete ? '± ' : ''}{formatEuro(recipe.price_per_person)}
          </p>
        </div>
        <div
          style={{
            flex: 1,
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '14px',
            textAlign: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}
        >
          <p style={{ fontSize: '11px', color: '#6b7785', margin: '0 0 4px' }}>Totaal ({servings} pers.)</p>
          <p style={{ fontSize: '22px', fontWeight: 800, color: '#1a1a1a', margin: 0 }}>
            {priceIncomplete ? '± ' : ''}{formatEuro(recipe.total_price)}
          </p>
        </div>
      </div>

      {/* Ingrediënten */}
      <div style={{ padding: '20px 20px 0' }}>
        <h2
          style={{
            fontSize: '16px',
            fontWeight: 700,
            color: '#21303f',
            margin: '0 0 10px',
            padding: '0 4px',
          }}
        >
          Ingrediënten
        </h2>
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '8px 16px',
              fontSize: '11px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              color: '#6b7785',
              borderBottom: '1px solid #e6e8eb',
            }}
          >
            <span>Ingrediënt</span>
            <span>Prijs</span>
          </div>
          {recipe.ingredients.map((ing, idx) => (
            <div
              key={`${ing.name}-${idx}`}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 16px',
                borderBottom:
                  idx < recipe.ingredients.length - 1 ? '1px solid #e6e8eb' : 'none',
              }}
            >
              <div>
                <span style={{ fontSize: '13px', fontWeight: 500, color: '#1a1a1a' }}>
                  {ing.name}
                </span>
                {ing.is_deal && (
                  <span
                    style={{
                      display: 'block',
                      fontSize: '11px',
                      color: '#f28e00',
                      fontWeight: 600,
                      marginTop: '2px',
                    }}
                  >
                    ↓ Aanbieding
                  </span>
                )}
                {ing.is_pantry && (
                  <span
                    style={{
                      display: 'block',
                      fontSize: '11px',
                      color: '#16a34a',
                      fontWeight: 500,
                      marginTop: '2px',
                    }}
                  >
                    ✓ In huis
                  </span>
                )}
                {!ing.is_pantry && ing.supermarket && (
                  <span
                    style={{
                      display: 'block',
                      fontSize: '11px',
                      color: '#00a0e2',
                      fontWeight: 500,
                      marginTop: '2px',
                    }}
                  >
                    {ing.supermarket}
                  </span>
                )}
              </div>
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: ing.is_pantry
                    ? '#16a34a'
                    : ing.price == null
                      ? '#d97706'
                      : '#1a1a1a',
                  flexShrink: 0,
                  marginLeft: '12px',
                }}
              >
                {ing.is_pantry
                  ? '€ 0,—'
                  : ing.price == null
                    ? 'n.t.b.'
                    : ing.price > 0
                      ? formatEuro(ing.price)
                      : '—'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Bereiding */}
      {instructions.length > 0 && (
        <div style={{ padding: '20px 20px 0' }}>
          <h2
            style={{
              fontSize: '16px',
              fontWeight: 700,
              color: '#21303f',
              margin: '0 0 10px',
              padding: '0 4px',
            }}
          >
            Aan de slag
          </h2>
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            }}
          >
            {instructions.map((step, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'flex-start',
                  marginBottom: idx < instructions.length - 1 ? '12px' : '0',
                }}
              >
                <span
                  style={{
                    flexShrink: 0,
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: '#e6f6fd',
                    color: '#00a0e2',
                    fontSize: '13px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {idx + 1}
                </span>
                <p
                  style={{
                    margin: 0,
                    fontSize: '13px',
                    lineHeight: 1.6,
                    color: '#1a1a1a',
                    paddingTop: '4px',
                  }}
                >
                  {step}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div
        style={{
          margin: '20px 20px 20px',
          padding: '14px 16px',
          borderRadius: '12px',
          backgroundColor: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}
      >
        <div
          style={{
            width: '22px',
            height: '22px',
            borderRadius: '6px',
            backgroundColor: '#00a0e2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            color: 'white',
            flexShrink: 0,
          }}
        >
          🍳
        </div>
        <span style={{ fontSize: '12px', color: '#6b7785' }}>
          Gedeeld via{' '}
          <strong style={{ color: '#21303f', fontWeight: 700 }}>FamApp</strong>
          {' '}· Slim en voordelig koken
        </span>
      </div>
    </div>
  );
});
ShareCard.displayName = 'ShareCard';

function IngredientRow({ ing }: { ing: PricedIngredient }) {
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-ink">{ing.name}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted">
          {ing.is_deal && (
            <span className="inline-flex items-center gap-1 font-semibold text-kortingOrange">
              <i className="ph-fill ph-tag text-[10px]" aria-hidden="true" />
              Aanbieding
              {ing.original_price ? (
                <span className="font-normal text-muted line-through">
                  {formatEuro(ing.original_price)}
                </span>
              ) : null}
            </span>
          )}
          {ing.is_pantry ? (
            <span className="inline-flex items-center gap-1 font-medium text-green-600">
              <i className="ph ph-house text-[10px]" aria-hidden="true" />
              In huis
            </span>
          ) : ing.supermarket ? (
            <span className="inline-flex items-center gap-1 font-medium text-ahBlue">
              <i className="ph ph-storefront text-[10px]" aria-hidden="true" />
              {ing.supermarket}
            </span>
          ) : null}
        </div>
      </div>
      <span
        className={`shrink-0 text-sm font-semibold ${
          ing.is_pantry
            ? 'text-green-600'
            : ing.price == null
              ? 'text-amber-600'
              : 'text-ink'
        }`}
      >
        {ing.is_pantry
          ? '€ 0,—'
          : ing.price == null
            ? 'n.t.b.'
            : ing.price > 0
              ? formatEuro(ing.price)
              : '—'}
      </span>
    </li>
  );
}
