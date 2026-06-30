'use client';

import type { FinalRecipe } from '@/lib/types';
import { RecipeCard } from './RecipeCard';

interface RecipeGridProps {
  recipes: FinalRecipe[];
  onOpen: (recipe: FinalRecipe) => void;
  title?: string;
}

export function RecipeGrid({ recipes, onOpen, title }: RecipeGridProps) {
  if (recipes.length === 0) return null;

  return (
    <section className="space-y-3">
      {title && <h2 className="px-1 text-lg font-bold text-navy">{title}</h2>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {recipes.map((recipe, idx) => (
          <RecipeCard
            key={`${recipe.recipe_name}-${idx}`}
            recipe={recipe}
            onOpen={onOpen}
          />
        ))}
      </div>
    </section>
  );
}
