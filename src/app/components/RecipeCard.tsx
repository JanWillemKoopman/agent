'use client';

import { useState } from 'react';
import type { FinalRecipe } from '@/lib/types';

const PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300'>
      <rect width='100%' height='100%' fill='#f4f5f7'/>
      <text x='50%' y='50%' font-family='system-ui' font-size='20' fill='#9aa0a6'
        text-anchor='middle' dominant-baseline='middle'>Geen afbeelding</text>
    </svg>`
  );

interface RecipeCardProps {
  recipe: FinalRecipe;
  saved: boolean;
  onToggleSave: (recipe: FinalRecipe) => void;
}

export function RecipeCard({ recipe, saved, onToggleSave }: RecipeCardProps) {
  const [imgSrc, setImgSrc] = useState(recipe.image_url || PLACEHOLDER);

  return (
    <article className="overflow-hidden rounded-card bg-surface shadow-card">
      <div className="relative aspect-[4/3] w-full bg-appBg">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imgSrc}
          alt={recipe.recipe_name}
          className="h-full w-full object-cover"
          onError={() => setImgSrc(PLACEHOLDER)}
        />
        <button
          type="button"
          aria-label={saved ? 'Verwijder uit favorieten' : 'Bewaar recept'}
          onClick={() => onToggleSave(recipe)}
          className="absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-pill bg-surface/90 shadow-card transition-transform hover:scale-105"
        >
          <i
            className={`${saved ? 'ph-fill ph-heart text-bonusOrange' : 'ph ph-heart text-dark'} text-xl`}
            aria-hidden="true"
          />
        </button>
      </div>

      <div className="space-y-2 p-4">
        {recipe.bonus_deal_count > 0 && (
          <span className="inline-block rounded bg-bonusOrange px-2 py-1 text-xs font-bold uppercase text-white">
            {recipe.bonus_deal_count}x BONUS DEALS
          </span>
        )}

        <h3 className="text-base font-bold text-dark">{recipe.recipe_name}</h3>
        <p className="line-clamp-2 text-sm text-gray-500">{recipe.description}</p>

        <div className="flex items-center justify-between pt-1">
          <span className="text-lg font-bold text-dark">
            € {recipe.price_per_person.toFixed(2).replace('.', ',')} p.p.
          </span>
          {recipe.supermarkets.length > 0 && (
            <span className="text-xs text-gray-500">
              {recipe.supermarkets.join(', ')}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
