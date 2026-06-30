'use client';

import type { FinalRecipe } from '@/lib/types';
import { formatEuro } from '@/lib/format';

interface RecipeCardProps {
  recipe: FinalRecipe;
  onOpen: (recipe: FinalRecipe) => void;
}

export function RecipeCard({ recipe, onOpen }: RecipeCardProps) {
  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onOpen(recipe)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(recipe);
        }
      }}
      className="flex cursor-pointer flex-col gap-2 rounded-card bg-surface p-4 text-left shadow-card transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ahBlue"
    >
      <div className="flex flex-wrap items-center gap-1.5">
        {recipe.korting_deal_count > 0 && (
          <span className="inline-flex items-center gap-1 rounded-md bg-kortingOrange px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
            <i className="ph-fill ph-tag text-xs" aria-hidden="true" />
            {recipe.korting_deal_count}x korting
          </span>
        )}
        <span className="inline-flex items-center gap-1 rounded-md bg-appBg px-2 py-0.5 text-[11px] font-medium text-muted">
          <i className="ph ph-users-three text-xs" aria-hidden="true" />
          {recipe.servings || 4} pers.
        </span>
      </div>

      <h3 className="text-base font-bold leading-snug text-navy">{recipe.recipe_name}</h3>
      <p className="line-clamp-2 text-sm text-muted">{recipe.description}</p>

      <div className="mt-1 flex items-end justify-between">
        <div>
          <span className="text-xl font-extrabold text-ink">
            {formatEuro(recipe.price_per_person)}
          </span>
          <span className="ml-1 text-xs text-muted">p.p.</span>
        </div>
        {recipe.supermarkets.length > 0 && (
          <span className="inline-flex items-center gap-1 text-xs text-muted">
            <i className="ph ph-storefront text-sm" aria-hidden="true" />
            {recipe.supermarkets.join(', ')}
          </span>
        )}
      </div>
    </article>
  );
}
