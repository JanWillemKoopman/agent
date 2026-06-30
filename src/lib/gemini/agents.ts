import {
  generateStructured,
  generateGroundedJson,
  GEMINI_FLASH_LITE,
  GEMINI_CHEF,
} from './client';
import { chefResponseSchema, criticResponseSchema } from './schemas';
import { forageDeals, STORE_DEALS_URLS, STORE_SEARCH_HINTS } from './forager';
import type { Deal, RecipeConcept, PriceMap } from '../types';

export { forageDeals };

// ---------------------------------------------------------------------------
// Stap 2 — The Chefs (Mixture of Experts, geen search). 8 parallelle persona's.
// ---------------------------------------------------------------------------
export interface ChefPersona {
  id: string;
  systemInstruction: string;
}

export const CHEF_PERSONAS: ChefPersona[] = [
  {
    id: 'Chef Snel',
    systemInstruction:
      'Je bent Chef Snel. Bedenk 6 gezonde 4-persoons dinerrecepten die binnen 20 minuten klaar zijn. Hergebruik zo veel mogelijk de aangeboden aanbiedingen.',
  },
  {
    id: 'Chef Vega',
    systemInstruction:
      'Je bent Chef Vega. Bedenk 6 creatieve, gezonde 4-persoons vegetarische dinerrecepten. Hergebruik zo veel mogelijk de aangeboden aanbiedingen.',
  },
  {
    id: 'Chef Wereldkeuken',
    systemInstruction:
      'Je bent Chef Wereldkeuken. Bedenk 6 smaakvolle, gezonde 4-persoons dinerrecepten geïnspireerd op de wereldkeuken. Hergebruik zo veel mogelijk de aangeboden aanbiedingen.',
  },
  {
    id: 'Chef Gezond',
    systemInstruction:
      'Je bent Chef Gezond. Bedenk 6 macro-gebalanceerde 4-persoons dinerrecepten met een goede verhouding eiwitten, koolhydraten en vetten. Hergebruik zo veel mogelijk de aangeboden aanbiedingen.',
  },
  {
    id: 'Chef Budget',
    systemInstruction:
      'Je bent Chef Budget. Bedenk 6 uiterst goedkope 4-persoons dinerrecepten die maximaal gebruik maken van de kortingaanbiedingen en zo min mogelijk dure standaardingrediënten bevatten.',
  },
  {
    id: 'Chef Familie',
    systemInstruction:
      'Je bent Chef Familie. Bedenk 6 kindvriendelijke, smakelijke 4-persoons dinerrecepten die ook kinderen van 6–12 jaar lekker vinden. Hergebruik zo veel mogelijk de aangeboden aanbiedingen.',
  },
  {
    id: 'Chef Gourmet',
    systemInstruction:
      'Je bent Chef Gourmet. Bedenk 6 verfijnde maar haalbare 4-persoons dinerrecepten op restaurantniveau die thuiskoks kunnen maken. Hergebruik zo veel mogelijk de aangeboden aanbiedingen.',
  },
  {
    id: 'Chef Slow',
    systemInstruction:
      'Je bent Chef Slow. Bedenk 6 comfortabele 4-persoons dinerrecepten voor de oven of slowcooker waarbij het gerecht grotendeels zichzelf bereidt. Hergebruik zo veel mogelijk de aangeboden aanbiedingen.',
  },
];

export async function chefRecipes(
  persona: ChefPersona,
  deals: Deal[],
  excludedIngredients: string[] = []
): Promise<RecipeConcept[]> {
  // Stuur deals als compacte JSON inclusief deal_type zodat chefs weten
  // welke soort aanbieding het is en hoeveel eenheden minimaal nodig zijn.
  const dealSummary = deals.map((d) => {
    const discountPct =
      d.original_price && d.original_price > 0
        ? Math.round((1 - d.deal_price / d.original_price) * 100)
        : null;
    return {
      product_name: d.product_name,
      deal_price: d.deal_price,
      original_price: d.original_price,
      deal_type: d.deal_type,
      deal_description: d.deal_description ?? null,
      min_quantity: d.min_quantity ?? 1,
      supermarket: d.supermarket,
      discount_pct: discountPct,
    };
  });

  const exclusionNote =
    excludedIngredients.length > 0
      ? `\n\nBELANGRIJK: gebruik NOOIT de volgende ingrediënten — verwerk ze niet in recepten, ook niet als bijgerecht of optionele toevoeging:\n${excludedIngredients.map((i) => `- ${i}`).join('\n')}\n`
      : '';

  const prompt = `Hier is de complete lijst met actuele supermarktaanbiedingen (${dealSummary.length} deals, JSON):
${JSON.stringify(dealSummary)}

Instructies:
- Kies voor jouw 6 recepten de MEEST inspirerende combinaties uit de bovenstaande lijst.
- Prioriteer aanbiedingen met een hoge discount_pct (beste waarde) of een uniek deal_type.
- Zorg dat je 6 recepten samen meerdere productcategorieën bestrijken (niet 6× hetzelfde hoofdbestanddeel).
- Bij min_quantity > 1 (bv. deal_type "bogo" of "multi_buy"): gebruik minimaal dat aantal eenheden van dat product in het recept om de deal te benutten.${exclusionNote}

Geef voor elk recept terug:
- "recipe_name"
- "description": één korte, smakelijke zin
- "base_deal_ingredients": exact de product_name-waarden uit de bovenstaande lijst die je gebruikt — kopieer de volledige officiële naam inclusief merk en gewicht (bv. "AH Kipfilet 600g"), gebruik GEEN verkorte of generieke varianten
- "required_standard_ingredients": reguliere producten die NIET in de aanbiedingenlijst staan, inclusief de benodigde hoeveelheid voor 4 personen (bv. "500g wortelen", "2 uien", "1L volle melk", "200g pasta") — geen pantry-basisproducten zoals zout, peper, olie of bloem
- "instructions": de volledige bereiding als array van duidelijke stappen (5 tot 8 korte stappen) voor 4 personen`;

  const result = await generateStructured<{ recipes: RecipeConcept[] }>({
    systemInstruction: persona.systemInstruction,
    prompt,
    responseSchema: chefResponseSchema,
    model: GEMINI_CHEF,
  });
  return result.recipes ?? [];
}

// ---------------------------------------------------------------------------
// Stap 3 — The Critic (kwaliteitscontrole). 3 parallelle calls, elk 1/3 van de concepten.
// ---------------------------------------------------------------------------
export async function criticFilter(
  concepts: RecipeConcept[]
): Promise<RecipeConcept[]> {
  const third = Math.ceil(concepts.length / 3);
  const groups = [
    concepts.slice(0, third),
    concepts.slice(third, third * 2),
    concepts.slice(third * 2),
  ].filter((g) => g.length > 0);

  const keepPerGroup = Math.ceil(16 / groups.length);

  const criticPrompt = (group: RecipeConcept[]) =>
    `Beoordeel deze lijst met receptconcepten als een professionele chef en diëtist.

Verwijder recepten die:
- culinair niet kloppen of een logische fout bevatten
- ongezond zijn voor een gezin
- te complex zijn voor een gemiddelde thuiskok
- sterk overlappen met een ander recept in dezelfde lijst (zelfde hoofdbestanddeel én zelfde bereidingswijze)

Behoud de beste ${keepPerGroup} recepten en streef naar maximale diversiteit:
- Variatie in hoofdbestanddeel (niet 3× kip als dat te veel is)
- Variatie in bereidingswijze (bakken, koken, oven, wok, etc.)
- Variatie in supermarkt (gebruik deals van zo veel mogelijk winkels)
- Variatie in keuken of smaakprofiel

Behoud per recept ALLE velden ongewijzigd, inclusief de volledige "instructions". Verbeter onduidelijke stappen, maar laat ze nooit weg.

Receptconcepten (JSON):
${JSON.stringify(group)}`;

  const systemInstruction =
    'Je bent een strenge maar eerlijke culinair criticus en diëtist. Behoud uitsluitend de beste, gezonde en haalbare recepten.';

  const results = await Promise.allSettled(
    groups.map((group) =>
      generateStructured<{ recipes: RecipeConcept[] }>({
        systemInstruction,
        prompt: criticPrompt(group),
        responseSchema: criticResponseSchema,
        model: GEMINI_CHEF,
      })
    )
  );

  const merged = results.flatMap((r) =>
    r.status === 'fulfilled' ? (r.value.recipes ?? []) : []
  );
  return merged.slice(0, 16);
}

// ---------------------------------------------------------------------------
// Stap 4 — The Shoppers (Gemini + google_search). Max 10 calls, 1 recept per chunk.
// ---------------------------------------------------------------------------
const MAX_SHOPPER_CALLS = 16;

function buildShopPrompt(ingredients: string[], stores: string[], extraNote = ''): string {
  return `Zoek via Google Search naar de actuele, reguliere prijzen en bijbehorende productafbeeldings-URL's van de volgende ingrediënten bij deze supermarkten: ${stores.join(', ')}.

Ingrediënten: ${ingredients.join(', ')}${extraNote}

Geef de data UITSLUITEND terug als een geldige JSON-map (zonder uitleg, zonder markdown) waarbij elke sleutel exact overeenkomt met de ingrediëntnaam zoals hierboven opgegeven, en de waarde een object is met:
- "price" (number, reguliere prijs in euro's voor de opgegeven hoeveelheid)
- "image_url" (string met product-afbeelding URL van het dichtstbijzijnde product, of null)

Ga NIET zelf rekenen; geef alleen losse prijzen.`;
}

export async function shopPrices(
  recipesChunk: RecipeConcept[],
  stores: string[]
): Promise<PriceMap> {
  const ingredients = Array.from(
    new Set(recipesChunk.flatMap((r) => r.required_standard_ingredients))
  );
  if (ingredients.length === 0) return {};

  const prompt = buildShopPrompt(ingredients, stores);
  return await generateGroundedJson<PriceMap>({ prompt, model: GEMINI_FLASH_LITE });
}

/**
 * Tweede, gerichte prijs-call: haalt UITSLUITEND de prijzen op van ingrediënten
 * die in de eerste ronde (shopPrices) geen geldige prijs kregen — bijvoorbeeld
 * doordat die Shopper-call faalde of een onvolledige map teruggaf. Eén losse
 * call met de complete ontbrekende-lijst, zodat een eerder gefaalde call niet
 * een heel recept op €0 laat staan.
 */
export async function shopMissingPrices(
  ingredients: string[],
  stores: string[]
): Promise<PriceMap> {
  if (ingredients.length === 0) return {};

  const prompt = buildShopPrompt(
    ingredients,
    stores,
    '\n\nDeze prijzen ontbraken in een eerdere poging — doe extra moeite om voor ELK ingrediënt een reële prijs te vinden bij een van de genoemde supermarkten.'
  );
  return await generateGroundedJson<PriceMap>({ prompt, model: GEMINI_FLASH_LITE });
}

// ---------------------------------------------------------------------------
// Tracker — zoek of specifieke producten deze week in de aanbieding zijn.
// ---------------------------------------------------------------------------

/**
 * Controleert voor één winkel of de opgegeven producten in de aanbieding zijn.
 * Retourneert alleen producten die daadwerkelijk kortingen hebben.
 */
export async function searchTrackerDealsForStore(
  productNames: string[],
  store: string
): Promise<Deal[]> {
  let urlHint: string;
  if (STORE_DEALS_URLS[store]) {
    urlHint = `Raadpleeg ${STORE_DEALS_URLS[store]} en gebruik Google Search.`;
  } else if (STORE_SEARCH_HINTS[store]) {
    urlHint = STORE_SEARCH_HINTS[store];
  } else {
    urlHint = `Zoek via Google Search naar actuele aanbiedingen van ${store} Nederland.`;
  }

  const productList = productNames.map((n) => `- ${n}`).join('\n');

  const prompt = `Controleer of de volgende producten deze week in de aanbieding zijn bij ${store} in Nederland.

${urlHint}

Te controleren producten:
${productList}

Geef de resultaten UITSLUITEND terug als een geldige JSON array (zonder uitleg, zonder markdown).
Neem ALLEEN producten op die daadwerkelijk kortingen hebben bij ${store} deze week.
Als er geen aanbiedingen zijn geef dan een lege array: []

Elk element in de array heeft deze velden:
- "product_name" (string: de officiële productnaam zoals vermeld in de supermarkt, inclusief merk en gewicht/volume, bv. "AH Kipfilet 600g", "Jumbo Halfvolle melk 1L")
- "deal_type" (string: "single" | "bogo" | "multi_buy" | "percentage_off")
- "min_quantity" (number: 1 bij single/percentage_off, 2+ bij bogo/multi_buy)
- "bundle_price" (number of null)
- "deal_price" (number: effectieve prijs per eenheid)
- "original_price" (number of null)
- "deal_description" (string of null: bv. "2e gratis", "50% korting")
- "supermarket" (string: gebruik exact "${store}")`;

  let result: Deal[];
  try {
    const raw = await generateGroundedJson<Deal[]>({ prompt, model: GEMINI_FLASH_LITE });
    result = Array.isArray(raw) ? raw : [];
  } catch (err) {
    console.error(`Tracker-zoekopdracht voor ${store} faalde:`, err);
    return [];
  }

  return result
    .map((d) => ({ ...d, supermarket: d.supermarket || store }))
    .filter((d) => d.product_name && typeof d.deal_price === 'number');
}

export { MAX_SHOPPER_CALLS };
