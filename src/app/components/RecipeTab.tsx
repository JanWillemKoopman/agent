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
  onOpen: (recipe: FinalRecipe) => void;
  hasDataToday: boolean;
  onOpenDataRefresh: () => void;
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

function NoDataBanner({ onOpenDataRefresh }: { onOpenDataRefresh: () => void }) {
  return (
    <div className="rounded-card border border-kortingOrange/30 bg-[#fff8ee] p-4">
      <div className="flex items-start gap-3">
        <i className="ph-fill ph-warning-circle mt-0.5 shrink-0 text-xl text-kortingOrange" aria-hidden="true" />
        <div className="space-y-2">
          <p className="text-sm font-semibold text-navy">Geen aanbiedingen geladen</p>
          <p className="text-xs leading-relaxed text-muted">
            Om recepten te kunnen genereren moeten eerst de actuele supermarkt-
            aanbiedingen worden opgehaald.
          </p>
          <button
            type="button"
            onClick={onOpenDataRefresh}
            className="flex items-center gap-1.5 rounded-pill bg-kortingOrange px-4 py-2 text-xs font-bold text-white hover:bg-[#d97b00] transition-colors active:scale-[0.98]"
          >
            <i className="ph ph-cloud-arrow-down text-sm" aria-hidden="true" />
            Aanbiedingen ophalen
          </button>
        </div>
      </div>
    </div>
  );
}

export function RecipeTab({
  isGenerating,
  statusLines,
  recipes,
  error,
  onGenerate,
  onOpen,
  hasDataToday,
  onOpenDataRefresh,
}: RecipeTabProps) {
  const isEmpty =
    !isGenerating && recipes.length === 0 && statusLines.length === 0;

  const handleGenerate = () => {
    if (!hasDataToday) {
      onOpenDataRefresh();
      return;
    }
    onGenerate();
  };

  if (isEmpty) {
    return (
      <div className="flex min-h-[calc(100dvh-8.5rem)] flex-col items-center justify-center gap-6">
        <Intro />
        {!hasDataToday && <NoDataBanner onOpenDataRefresh={onOpenDataRefresh} />}
        <GenerateButton onClick={handleGenerate} isGenerating={isGenerating} />
        {error && <ErrorBox message={error} onRetry={hasDataToday ? onGenerate : undefined} />}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {!hasDataToday && !isGenerating && (
        <NoDataBanner onOpenDataRefresh={onOpenDataRefresh} />
      )}
      <GenerateButton onClick={handleGenerate} isGenerating={isGenerating} />

      <StatusStream lines={statusLines} isGenerating={isGenerating} />

      {error && (
        <ErrorBox
          message={error}
          onRetry={!isGenerating && hasDataToday ? onGenerate : undefined}
        />
      )}

      <RecipeGrid
        recipes={recipes}
        onOpen={onOpen}
        title={recipes.length > 0 ? 'Voorgestelde recepten' : undefined}
      />
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
