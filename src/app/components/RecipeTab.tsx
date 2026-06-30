'use client';

import type { FinalRecipe } from '@/lib/types';
import { GenerateButton } from './GenerateButton';
import { StatusStream } from './StatusStream';
import { RecipeGrid } from './RecipeGrid';

interface RecipeTabProps {
  isGenerating: boolean;
  statusLines: { step: number; message: string }[];
  recipes: FinalRecipe[];
  error: string | null;
  onGenerate: () => void;
  savedRecipes: FinalRecipe[];
  savedTitles: Set<string>;
  onToggleSave: (recipe: FinalRecipe) => void;
  onOpen: (recipe: FinalRecipe) => void;
}

interface ErrorBoxProps {
  message: string;
  onRetry?: () => void;
}

const Intro = () => (
  <div className="space-y-3 text-center">
    <h1 className="text-2xl font-extrabold leading-tight text-navy">
      Wat eten we vandaag?
    </h1>
    <p className="mx-auto max-w-md text-sm leading-relaxed text-muted">
      FamApp bedenkt gezonde, voordelige diners op basis van de actuele
      aanbiedingen van jouw supermarkten. Druk op de knop en onze digitale
      keukenbrigade zoekt de beste deals, bedenkt recepten en rekent de prijs
      per persoon voor je uit.
    </p>
  </div>
);

export function RecipeTab({
  isGenerating,
  statusLines,
  recipes,
  error,
  onGenerate,
  savedRecipes,
  savedTitles,
  onToggleSave,
  onOpen,
}: RecipeTabProps) {
  const isEmpty =
    !isGenerating &&
    recipes.length === 0 &&
    savedRecipes.length === 0 &&
    statusLines.length === 0;

  // Lege staat: knop + intro horizontaal én verticaal gecentreerd.
  if (isEmpty) {
    return (
      <div className="flex min-h-[calc(100dvh-8.5rem)] flex-col items-center justify-center gap-6">
        <Intro />
        <GenerateButton onClick={onGenerate} isGenerating={isGenerating} />
        {error && <ErrorBox message={error} onRetry={onGenerate} />}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <GenerateButton onClick={onGenerate} isGenerating={isGenerating} />

      <StatusStream lines={statusLines} isGenerating={isGenerating} />

      {error && <ErrorBox message={error} onRetry={!isGenerating ? onGenerate : undefined} />}

      <RecipeGrid
        recipes={recipes}
        savedTitles={savedTitles}
        onToggleSave={onToggleSave}
        onOpen={onOpen}
        title={recipes.length > 0 ? 'Voorgestelde recepten' : undefined}
      />

      {recipes.length === 0 && savedRecipes.length > 0 && (
        <RecipeGrid
          recipes={savedRecipes}
          savedTitles={savedTitles}
          onToggleSave={onToggleSave}
          onOpen={onOpen}
          title="Bewaarde recepten"
        />
      )}
    </div>
  );
}

function ErrorBox({ message, onRetry }: ErrorBoxProps) {
  return (
    <div className="rounded-card border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      <div className="flex items-start gap-2">
        <i className="ph-fill ph-warning-circle mt-0.5 shrink-0 text-base" aria-hidden="true" />
        <span className="leading-snug">{message}</span>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 flex items-center gap-1.5 rounded-pill bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-200 transition-colors"
        >
          <i className="ph ph-arrow-clockwise text-sm" aria-hidden="true" />
          Probeer opnieuw
        </button>
      )}
    </div>
  );
}
