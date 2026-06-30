import type {
  Deal,
  RecipeConcept,
  PriceMap,
  FinalRecipe,
  PricedIngredient,
} from '../types';

const SERVINGS = 4;

// Ingrediënten die standaard in huis zouden moeten zijn; prijs = €0.
// Inclusief de verse basisaromaten (ui, knoflook, sjalot) die in vrijwel elk
// recept terugkomen en die de gebruiker als basisvoorraad beschouwt.
const PANTRY_KEYWORDS = [
  'olijfolie', 'zonnebloemolie', 'olie', 'boter',
  'zout', 'peper', 'zwarte peper', 'witte peper', 'cayennepeper',
  'suiker', 'poedersuiker', 'bruine suiker',
  'bloem', 'maizena',
  'azijn', 'wijnazijn', 'balsamicoazijn', 'appelazijn',
  'knoflook', 'knoflookpoeder', 'uienpoeder',
  'ui', 'uien', 'rode ui', 'sjalot', 'sjalotten',
  'paprikapoeder', 'komijn', 'kurkuma', 'kerrie', 'curry',
  'oregano', 'basilicum', 'tijm', 'rozemarijn', 'peterselie',
  'laurierblad', 'nootmuskaat', 'kaneel', 'chiliflakes',
  'sojasaus', 'worcestershiresaus',
  'mosterd', 'mayonaise',
  'water', 'ijs',
];

function normalize(s: string): string {
  return s.toLowerCase().trim();
}

/** Escape voor gebruik van een keyword in een RegExp. */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Matcht een keyword op WOORDGRENS, niet als losse substring. Voorkomt dat
 * korte keywords als "ui" ten onrechte matchen in "fruit" of "bosui", of
 * "peper" in "peperkoek". "2 teentjes knoflook" → matcht "knoflook"; "1 ui"
 * → matcht "ui"; "300g fruit" → matcht NIET "ui".
 */
function matchesKeyword(haystack: string, keyword: string): boolean {
  return new RegExp(`\\b${escapeRegex(keyword)}\\b`).test(haystack);
}

function isPantryItem(name: string): boolean {
  const n = normalize(name);
  return PANTRY_KEYWORDS.some((k) => matchesKeyword(n, k));
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
  let kortingDealCount = 0;
  let imageUrl: string | null = null;

  for (const name of concept.base_deal_ingredients ?? []) {
    const deal = findDeal(name, deals);
    if (deal) {
      kortingDealCount += 1;
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
      // Aanbieding niet teruggevonden in de deals → prijs onbekend (null),
      // niet gratis. Telt mee als onvolledig recept.
      ingredients.push({ name, price: null, is_deal: true });
    }
  }

  for (const name of concept.required_standard_ingredients ?? []) {
    const pantry = isPantryItem(name);
    if (pantry) {
      ingredients.push({ name, price: 0, is_deal: false, is_pantry: true });
      continue;
    }
    const entry = findPrice(name, prices);
    if (entry?.image_url && !imageUrl) imageUrl = entry.image_url;
    // Alleen een echte, positieve prijs telt; anders onbekend (null).
    const price =
      entry && typeof entry.price === 'number' && entry.price > 0
        ? entry.price
        : null;
    ingredients.push({
      name,
      price,
      is_deal: false,
      is_pantry: false,
      image_url: entry?.image_url ?? null,
    });
  }

  // Totaal uit uitsluitend BEKENDE prijzen. Een ontbrekende (niet-pantry)
  // prijs maakt het recept onvolledig → total is dan een richtprijs.
  const total = ingredients.reduce((sum, i) => sum + (i.price ?? 0), 0);
  const perPerson = total / SERVINGS;
  const priceComplete = !ingredients.some((i) => !i.is_pantry && i.price === null);

  return {
    recipe_name: concept.recipe_name,
    description: concept.description,
    ingredients,
    instructions: concept.instructions ?? [],
    servings: SERVINGS,
    supermarkets: Array.from(supermarkets),
    korting_deal_count: kortingDealCount,
    total_price: round2(total),
    price_per_person: round2(perPerson),
    price_complete: priceComplete,
    image_url: imageUrl,
  };
}

/**
 * Bepaalt welke niet-pantry standaardingrediënten over alle concepten nog géén
 * geldige prijs hebben in de price-map. Gebruikt voor een gerichte tweede
 * Shopper-call die alleen de ontbrekende prijzen ophaalt (zie pipeline stap 4b).
 */
export function findMissingPriceIngredients(
  concepts: RecipeConcept[],
  prices: PriceMap
): string[] {
  const missing = new Set<string>();
  for (const concept of concepts) {
    for (const name of concept.required_standard_ingredients ?? []) {
      if (isPantryItem(name)) continue;
      const entry = findPrice(name, prices);
      if (!entry || typeof entry.price !== 'number' || entry.price <= 0) {
        missing.add(name);
      }
    }
  }
  return Array.from(missing);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function containsExcluded(recipe: FinalRecipe, excluded: string[]): boolean {
  if (excluded.length === 0) return false;
  const normalizedExclusions = excluded.map(normalize);
  return recipe.ingredients.some((ing) => {
    const n = normalize(ing.name);
    return normalizedExclusions.some((ex) => n.includes(ex) || ex.includes(n));
  });
}

/**
 * Rekent alle recepten door, filtert op uitgesloten ingrediënten en sorteert
 * oplopend op prijs per persoon.
 */
export function calculateRecipes(
  concepts: RecipeConcept[],
  deals: Deal[],
  prices: PriceMap,
  excludedIngredients: string[] = []
): FinalRecipe[] {
  return concepts
    .map((c) => priceRecipe(c, deals, prices))
    .filter((r) => {
      if (r.total_price <= 0) return false;
      if (containsExcluded(r, excludedIngredients)) return false;
      return true;
    })
    .sort((a, b) => a.price_per_person - b.price_per_person);
}
