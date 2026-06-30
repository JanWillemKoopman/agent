import {
  chefRecipes,
  criticFilter,
  shopPrices,
  shopMissingPrices,
  CHEF_PERSONAS,
  MAX_SHOPPER_CALLS,
} from '../gemini/agents';
import { getCachedDealsOrForage } from './deals-cache';
import { calculateRecipes, findMissingPriceIngredients } from './calculator';
import type { Deal, RecipeConcept, PriceMap, FinalRecipe } from '../types';

export type Emit = (step: number, message: string) => Promise<void>;

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
  emit: Emit,
  excludedIngredients: string[] = []
): Promise<FinalRecipe[]> {
  // --- Stap 1: The Foragers -------------------------------------------------
  const storeList =
    stores.length > 1
      ? stores.slice(0, -1).join(', ') + ' en ' + stores[stores.length - 1]
      : stores[0];
  await emit(1, `Aanbiedingen ophalen bij ${storeList}…`);
  const deals: Deal[] = await getCachedDealsOrForage(stores);

  if (deals.length === 0) {
    throw new Error('Geen aanbiedingen gevonden voor de geselecteerde winkels.');
  }

  // --- Stap 2: The Chefs ----------------------------------------------------
  await emit(2, `Recepten bedenken met ${deals.length} actuele deals…`);

  // Queue serialiseert de emit-calls van parallel draaiende chefs zodat DB-writes
  // niet over elkaar heen schrijven.
  let emitTail: Promise<void> = Promise.resolve();
  const enqueueEmit = (fn: () => Promise<void>) => {
    emitTail = emitTail.then(() => fn());
  };

  const concepts: RecipeConcept[] = (
    await Promise.all(
      CHEF_PERSONAS.map(async (p) => {
        try {
          const recipes = await chefRecipes(p, deals, excludedIngredients);
          enqueueEmit(() => emit(2, `chef_done:${p.id}:${recipes.length}`));
          return recipes;
        } catch (err) {
          console.error('Chef faalde:', err);
          enqueueEmit(() => emit(2, `chef_done:${p.id}:0`));
          return [] as RecipeConcept[];
        }
      })
    )
  ).flat();

  // Wacht tot alle chef-emits naar de DB zijn geschreven.
  await emitTail;

  if (concepts.length === 0) {
    throw new Error('De chefs konden geen recepten bedenken.');
  }

  // --- Stap 3: The Critic ---------------------------------------------------
  await emit(3, `Kwaliteit controleren van ${concepts.length} receptideeën…`);
  let bestConcepts: RecipeConcept[];
  try {
    bestConcepts = await criticFilter(concepts);
    if (bestConcepts.length === 0) bestConcepts = concepts.slice(0, 16);
  } catch (err) {
    console.error('Critic faalde, val terug op eerste 16 concepten:', err);
    bestConcepts = concepts.slice(0, 16);
  }

  // --- Stap 4: The Shoppers — chunk 1 recept per call, max MAX_SHOPPER_CALLS ------
  const uniqueIngredients = new Set(
    bestConcepts.flatMap((c) => c.required_standard_ingredients ?? [])
  );
  await emit(
    4,
    `Prijzen ophalen voor ${uniqueIngredients.size} ingrediënten (${bestConcepts.length} recepten)…`
  );
  const shopChunks = chunk(bestConcepts, 1).slice(0, MAX_SHOPPER_CALLS);
  const shopResults = await Promise.allSettled(
    shopChunks.map((c) => shopPrices(c, stores))
  );
  const prices: PriceMap = {};
  for (const r of shopResults) {
    if (r.status === 'fulfilled') {
      Object.assign(prices, r.value);
    } else {
      console.error('Shopper faalde:', r.reason);
    }
  }

  // --- Stap 4b: Tweede prijzenronde voor ontbrekende prijzen ----------------
  // Eén gefaalde of onvolledige Shopper-call zou anders een heel recept op €0
  // zetten. Verzamel de niet-pantry ingrediënten zonder geldige prijs en haal
  // die in één gerichte call alsnog op. Bestaande (geldige) prijzen blijven
  // staan; we vullen alleen de gaten.
  const missing = findMissingPriceIngredients(bestConcepts, prices);
  if (missing.length > 0) {
    await emit(4, `Ontbrekende prijzen aanvullen voor ${missing.length} ingrediënten…`);
    try {
      const extra = await shopMissingPrices(missing, stores);
      for (const [key, value] of Object.entries(extra)) {
        const existing = prices[key];
        const hasValid = existing && typeof existing.price === 'number' && existing.price > 0;
        if (!hasValid) prices[key] = value;
      }
    } catch (err) {
      console.error('Tweede prijzenronde faalde:', err);
    }
  }

  // --- Stap 5: The Calculator (deterministisch) -----------------------------
  await emit(5, `Recepten doorrekenen en samenstellen…`);
  return calculateRecipes(bestConcepts, deals, prices, excludedIngredients);
}
