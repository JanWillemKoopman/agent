import {
  forageDeals,
  chefRecipes,
  criticFilter,
  shopPrices,
  CHEF_PERSONAS,
} from '../gemini/agents';
import { calculateRecipes } from './calculator';
import type { Deal, RecipeConcept, PriceMap, FinalRecipe } from '../types';

export type Emit = (step: number, message: string) => void;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * Voert de 5-staps "Kitchen Brigade" workflow uit.
 * `emit` pusht statusberichten naar de SSE-stream. Parallelle calls gebruiken
 * `allSettled` zodat één gefaalde agent de pipeline niet laat crashen.
 */
export async function runKitchenBrigade(
  stores: string[],
  minPricePp: number,
  maxPricePp: number,
  emit: Emit
): Promise<FinalRecipe[]> {
  // --- Stap 1: The Foragers -------------------------------------------------
  emit(1, 'Aanbiedingen zoeken');
  const forageResults = await Promise.allSettled(stores.map((s) => forageDeals(s)));
  const deals: Deal[] = forageResults.flatMap((r) => {
    if (r.status === 'fulfilled') return r.value;
    console.error('Forager faalde:', r.reason);
    return [];
  });

  if (deals.length === 0) {
    throw new Error('Geen aanbiedingen gevonden voor de geselecteerde winkels.');
  }

  // --- Stap 2: The Chefs ----------------------------------------------------
  emit(2, 'Recepten bedenken');
  const chefResults = await Promise.allSettled(
    CHEF_PERSONAS.map((p) => chefRecipes(p, deals))
  );
  const concepts: RecipeConcept[] = chefResults.flatMap((r) => {
    if (r.status === 'fulfilled') return r.value;
    console.error('Chef faalde:', r.reason);
    return [];
  });

  if (concepts.length === 0) {
    throw new Error('De chefs konden geen recepten bedenken.');
  }

  // --- Stap 3: The Critic ---------------------------------------------------
  emit(3, 'Smaak en kwaliteit controleren');
  let bestConcepts: RecipeConcept[];
  try {
    bestConcepts = await criticFilter(concepts);
    if (bestConcepts.length === 0) bestConcepts = concepts.slice(0, 8);
  } catch (err) {
    console.error('Critic faalde, val terug op eerste 8 concepten:', err);
    bestConcepts = concepts.slice(0, 8);
  }

  // --- Stap 4: The Shoppers -------------------------------------------------
  emit(4, 'Ontbrekende prijzen ophalen');
  const shopResults = await Promise.allSettled(
    chunk(bestConcepts, 2).map((c) => shopPrices(c, stores))
  );
  const prices: PriceMap = {};
  for (const r of shopResults) {
    if (r.status === 'fulfilled') {
      Object.assign(prices, r.value);
    } else {
      console.error('Shopper faalde:', r.reason);
    }
  }

  // --- Stap 5: The Calculator (deterministisch) -----------------------------
  emit(5, 'Budget controleren');
  return calculateRecipes(bestConcepts, deals, prices, minPricePp, maxPricePp);
}
