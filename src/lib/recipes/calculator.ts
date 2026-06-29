import type {
  Deal,
  RecipeConcept,
  PriceMap,
  FinalRecipe,
  PricedIngredient,
} from '../types';

const SERVINGS = 4;

function normalize(s: string): string {
  return s.toLowerCase().trim();
}

/** Zoekt de best passende deal voor een ingrediëntnaam (case-insensitief). */
function findDeal(name: string, deals: Deal[]): Deal | undefined {
  const n = normalize(name);
  return (
    deals.find((d) => normalize(d.product_name) === n) ??
    deals.find(
      (d) => normalize(d.product_name).includes(n) || n.includes(normalize(d.product_name))
    )
  );
}

/** Zoekt de prijs/afbeelding voor een standaardingrediënt in de price-map. */
function findPrice(name: string, prices: PriceMap) {
  const n = normalize(name);
  const exact = prices[name] ?? prices[n];
  if (exact) return exact;
  const key = Object.keys(prices).find(
    (k) => normalize(k).includes(n) || n.includes(normalize(k))
  );
  return key ? prices[key] : undefined;
}

/**
 * Rekent één receptconcept door tot een definitief recept met prijzen.
 * Deterministisch — er komt geen AI aan te pas.
 */
function priceRecipe(
  concept: RecipeConcept,
  deals: Deal[],
  prices: PriceMap
): FinalRecipe {
  const ingredients: PricedIngredient[] = [];
  const supermarkets = new Set<string>();
  let bonusDealCount = 0;
  let imageUrl: string | null = null;

  for (const name of concept.base_deal_ingredients ?? []) {
    const deal = findDeal(name, deals);
    if (deal) {
      bonusDealCount += 1;
      supermarkets.add(deal.supermarket);
      // Gebruik bundle_price / min_quantity als effectieve kassaprijs per eenheid.
      // Dat is de prijs die de klant daadwerkelijk betaalt (bv. bij "2e gratis":
      // bundle_price=3.99, min_quantity=2 → effectief €1.995 per stuk).
      const effectivePrice =
        deal.bundle_price != null && deal.min_quantity > 1
          ? deal.bundle_price / deal.min_quantity
          : deal.deal_price;
      ingredients.push({
        name,
        price: effectivePrice,
        is_deal: true,
        original_price: deal.original_price ?? null,
        supermarket: deal.supermarket,
        deal_description: deal.deal_description ?? null,
        min_quantity: deal.min_quantity ?? 1,
      });
    } else {
      ingredients.push({ name, price: 0, is_deal: true });
    }
  }

  for (const name of concept.required_standard_ingredients ?? []) {
    const entry = findPrice(name, prices);
    if (entry?.image_url && !imageUrl) imageUrl = entry.image_url;
    ingredients.push({
      name,
      price: entry?.price ?? 0,
      is_deal: false,
      image_url: entry?.image_url ?? null,
    });
  }

  const total = ingredients.reduce((sum, i) => sum + (i.price || 0), 0);
  const perPerson = total / SERVINGS;

  return {
    recipe_name: concept.recipe_name,
    description: concept.description,
    ingredients,
    instructions: concept.instructions ?? [],
    servings: SERVINGS,
    supermarkets: Array.from(supermarkets),
    bonus_deal_count: bonusDealCount,
    total_price: round2(total),
    price_per_person: round2(perPerson),
    image_url: imageUrl,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Rekent alle recepten door, filtert op het prijs-per-persoon bereik uit de
 * gebruikersinstellingen en sorteert oplopend op prijs p.p.
 */
export function calculateRecipes(
  concepts: RecipeConcept[],
  deals: Deal[],
  prices: PriceMap,
  minPricePp: number,
  maxPricePp: number
): FinalRecipe[] {
  return concepts
    .map((c) => priceRecipe(c, deals, prices))
    .filter(
      (r) =>
        r.price_per_person >= minPricePp &&
        r.price_per_person <= maxPricePp &&
        r.total_price > 0
    )
    .sort((a, b) => a.price_per_person - b.price_per_person);
}
