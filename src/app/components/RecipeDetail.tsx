'use client';

import { useEffect } from 'react';
import type { FinalRecipe, PricedIngredient } from '@/lib/types';
import { formatEuro } from '@/lib/format';

interface RecipeDetailProps {
  recipe: FinalRecipe;
  saved: boolean;
  onToggleSave: (recipe: FinalRecipe) => void;
  onClose: () => void;
}

export function RecipeDetail({
  recipe,
  saved,
  onToggleSave,
  onClose,
}: RecipeDetailProps) {
  // Robuust tegen oudere bewaarde recepten zonder deze velden.
  const servings = recipe.servings || 4;
  const instructions = recipe.instructions ?? [];
  // price_complete ontbreekt op oudere bewaarde recepten → behandel als volledig.
  const priceIncomplete = recipe.price_complete === false;

  // Sluit met Escape en blokkeer scrollen van de achtergrond.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
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
        <button
          type="button"
          aria-label={saved ? 'Verwijder uit favorieten' : 'Bewaar recept'}
          onClick={() => onToggleSave(recipe)}
          className="flex h-10 w-10 items-center justify-center rounded-full text-ink transition-colors hover:bg-appBg"
        >
          <i
            className={`${
              saved ? 'ph-fill ph-heart text-ahBlue' : 'ph ph-heart text-muted'
            } text-2xl`}
            aria-hidden="true"
          />
        </button>
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
              opgehaald (zie “n.t.b.” hieronder).
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

      {/* Sticky bewaarknop onderaan */}
      <div
        className="fixed inset-x-0 bottom-0 border-t border-line bg-surface p-3"
        style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
      >
        <div className="mx-auto max-w-2xl">
          <button
            type="button"
            onClick={() => onToggleSave(recipe)}
            className={`flex w-full items-center justify-center gap-2 rounded-pill py-3 text-sm font-semibold transition-colors ${
              saved
                ? 'bg-ahBlueSoft text-ahBlueDark'
                : 'bg-ahBlue text-white hover:bg-ahBlueDark'
            }`}
          >
            <i
              className={`${saved ? 'ph-fill ph-heart' : 'ph ph-heart'} text-lg`}
              aria-hidden="true"
            />
            {saved ? 'Bewaard in favorieten' : 'Bewaar recept'}
          </button>
        </div>
      </div>
    </div>
  );
}

function IngredientRow({ ing }: { ing: PricedIngredient }) {
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-ink">
          {ing.name}
        </p>
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
