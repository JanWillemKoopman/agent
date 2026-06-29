import {
  generateStructured,
  generateGroundedJson,
  GEMINI_FLASH_LITE,
  GEMINI_CHEF,
} from './client';
import { chefResponseSchema, criticResponseSchema } from './schemas';
import type { Deal, RecipeConcept, PriceMap } from '../types';

// ---------------------------------------------------------------------------
// Stap 1 — The Foragers (Gemini + google_search). Eén exhaustieve loop per winkel.
// ---------------------------------------------------------------------------

const STORE_DEALS_URLS: Record<string, string> = {
  'Albert Heijn': 'https://www.ah.nl/bonus',
  'Jumbo': 'https://www.jumbo.com/aanbiedingen/nu',
  'Aldi': 'https://www.aldi.nl/aanbiedingen.html',
  'Plus': 'https://www.plus.nl/aanbiedingen',
  // Lidl has a dynamic weekly URL — Gemini searches for it via Google Search.
};

const MAX_FORAGER_ITERATIONS = 5;

function normalize(s: string): string {
  return s.toLowerCase().trim();
}

function buildForagerPrompt(
  store: string,
  urlHint: string,
  alreadyFound: string[]
): string {
  const exclusion =
    alreadyFound.length > 0
      ? `\n\nDe volgende producten heb je al gevonden — geef die NIET nogmaals terug:\n${alreadyFound.join(', ')}\n\nZoek uitsluitend naar ANDERE aanbiedingen die we nog niet hebben.`
      : '';

  return `Zoek naar de top 15 beste actuele supermarktaanbiedingen van deze week voor ${store} in Nederland, specifiek in de categorieën verse groenten, vlees, vis en vegetarische vervangers.

${urlHint}${exclusion}

Geef de resultaten UITSLUITEND terug als een geldige JSON array (zonder uitleg, zonder markdown) waarin elk element deze velden heeft:
- "product_name" (string)
- "deal_type" (string: exact één van: "single", "bogo", "multi_buy", "percentage_off")
  • single = losse prijs-aanbieding (bv. "nu €1,99")
  • bogo = 2e gratis (koop 2, betaal 1)
  • multi_buy = bundeldeal (bv. "2 voor €5", "3 voor €4")
  • percentage_off = procentuele korting (bv. "50% korting")
- "min_quantity" (number: minimaal te kopen stuks om de deal te krijgen; 1 bij single of percentage_off, 2 of meer bij bogo/multi_buy)
- "bundle_price" (number of null: totale kassaprijs voor min_quantity stuks; null bij single of percentage_off)
  • bogo-voorbeeld: kipfilet normaal €3,99 → bundle_price = 3.99 (je betaalt 1×, krijgt 2)
  • multi_buy-voorbeeld: "2 zalm voor €5" → bundle_price = 5.00
- "deal_price" (number: effectieve prijs per eenheid = bundle_price / min_quantity; bij single/percentage_off = de aanbiedings-stukprijs)
  • bogo-voorbeeld: 3.99 / 2 = 1.995
  • multi_buy-voorbeeld: 5.00 / 2 = 2.50
- "original_price" (number of null: reguliere stukprijs vóór de aanbieding, of null als onbekend)
- "deal_description" (string of null: exacte tekst zoals op de website, bv. "2e gratis", "2 voor €5,00", "50% korting")
- "supermarket" (string, gebruik exact "${store}")`;
}

export async function forageDeals(store: string): Promise<Deal[]> {
  const urlHint = STORE_DEALS_URLS[store]
    ? `Raadpleeg de aanbiedingspagina op ${STORE_DEALS_URLS[store]} en gebruik Google Search om de meest actuele aanbiedingen te vinden.`
    : `Zoek via Google Search naar de huidige aanbiedingspagina van ${store} Nederland (de URL wijzigt wekelijks) en haal daar de aanbiedingen vandaan.`;

  const allDeals: Deal[] = [];

  for (let i = 0; i < MAX_FORAGER_ITERATIONS; i++) {
    const alreadyFound = allDeals.map((d) => d.product_name);
    const prompt = buildForagerPrompt(store, urlHint, alreadyFound);

    let batch: Deal[];
    try {
      const raw = await generateGroundedJson<Deal[]>({ prompt, model: GEMINI_FLASH_LITE });
      batch = Array.isArray(raw) ? raw : [];
    } catch {
      break;
    }

    // Normalize and deduplicate against already-collected deals.
    const newDeals = batch
      .map((d) => ({ ...d, supermarket: d.supermarket || store }))
      .filter(
        (d) =>
          d.product_name &&
          !allDeals.some(
            (existing) => normalize(existing.product_name) === normalize(d.product_name)
          )
      );

    if (newDeals.length === 0) break;
    allDeals.push(...newDeals);
  }

  return allDeals;
}

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
      'Je bent Chef Snel. Bedenk 4 gezonde 4-persoons dinerrecepten die binnen 20 minuten klaar zijn. Hergebruik zo veel mogelijk de aangeboden aanbiedingen.',
  },
  {
    id: 'Chef Vega',
    systemInstruction:
      'Je bent Chef Vega. Bedenk 4 creatieve, gezonde 4-persoons vegetarische dinerrecepten. Hergebruik zo veel mogelijk de aangeboden aanbiedingen.',
  },
  {
    id: 'Chef Wereldkeuken',
    systemInstruction:
      'Je bent Chef Wereldkeuken. Bedenk 4 smaakvolle, gezonde 4-persoons dinerrecepten geïnspireerd op de wereldkeuken. Hergebruik zo veel mogelijk de aangeboden aanbiedingen.',
  },
  {
    id: 'Chef Gezond',
    systemInstruction:
      'Je bent Chef Gezond. Bedenk 4 macro-gebalanceerde 4-persoons dinerrecepten met een goede verhouding eiwitten, koolhydraten en vetten. Hergebruik zo veel mogelijk de aangeboden aanbiedingen.',
  },
  {
    id: 'Chef Budget',
    systemInstruction:
      'Je bent Chef Budget. Bedenk 4 uiterst goedkope 4-persoons dinerrecepten die maximaal gebruik maken van de bonusaanbiedingen en zo min mogelijk dure standaardingrediënten bevatten.',
  },
  {
    id: 'Chef Familie',
    systemInstruction:
      'Je bent Chef Familie. Bedenk 4 kindvriendelijke, smakelijke 4-persoons dinerrecepten die ook kinderen van 6–12 jaar lekker vinden. Hergebruik zo veel mogelijk de aangeboden aanbiedingen.',
  },
  {
    id: 'Chef Gourmet',
    systemInstruction:
      'Je bent Chef Gourmet. Bedenk 4 verfijnde maar haalbare 4-persoons dinerrecepten op restaurantniveau die thuiskoks kunnen maken. Hergebruik zo veel mogelijk de aangeboden aanbiedingen.',
  },
  {
    id: 'Chef Slow',
    systemInstruction:
      'Je bent Chef Slow. Bedenk 4 comfortabele 4-persoons dinerrecepten voor de oven of slowcooker waarbij het gerecht grotendeels zichzelf bereidt. Hergebruik zo veel mogelijk de aangeboden aanbiedingen.',
  },
];

export async function chefRecipes(
  persona: ChefPersona,
  deals: Deal[]
): Promise<RecipeConcept[]> {
  // Stuur deals als compacte JSON inclusief deal_description zodat chefs
  // weten hoeveel eenheden minimaal nodig zijn voor de deal.
  const dealSummary = deals.map((d) => ({
    product_name: d.product_name,
    deal_price: d.deal_price,
    original_price: d.original_price,
    supermarket: d.supermarket,
    deal_description: d.deal_description ?? null,
    min_quantity: d.min_quantity ?? 1,
  }));

  const prompt = `Hier is de complete lijst met huidige supermarktaanbiedingen (JSON):
${JSON.stringify(dealSummary)}

Let op: bij aanbiedingen met min_quantity > 1 (bv. "2e gratis") moeten recepten minimaal dat aantal eenheden van dat product gebruiken om de deal te benutten.

Bedenk de recepten volgens jouw specialisatie. Geef voor elk recept terug:
- "recipe_name"
- "description": één korte, smakelijke zin
- "base_deal_ingredients": welke aanbiedingen uit de lijst je gebruikt
- "required_standard_ingredients": welke reguliere (niet-aanbieding) producten nog nodig zijn
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

  const keepPerGroup = Math.ceil(8 / groups.length);

  const criticPrompt = (group: RecipeConcept[]) =>
    `Beoordeel deze lijst met receptconcepten als een professionele chef en diëtist. Verwijder recepten die culinair niet kloppen, ongezond zijn, of te complex zijn voor een thuiskok. Behoud de beste ${keepPerGroup} recepten en geef deze terug.

Behoud per recept ALLE velden ongewijzigd, inclusief de volledige "instructions" (bereidingsstappen). Verbeter onduidelijke of incomplete stappen waar nodig, maar laat ze nooit weg.

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
  return merged.slice(0, 8);
}

// ---------------------------------------------------------------------------
// Stap 4 — The Shoppers (Gemini + google_search). Max 10 calls, 1 recept per chunk.
// ---------------------------------------------------------------------------
const MAX_SHOPPER_CALLS = 10;

export async function shopPrices(
  recipesChunk: RecipeConcept[],
  stores: string[]
): Promise<PriceMap> {
  const ingredients = Array.from(
    new Set(recipesChunk.flatMap((r) => r.required_standard_ingredients))
  );
  if (ingredients.length === 0) return {};

  const prompt = `Zoek via Google Search naar de actuele, reguliere prijzen en bijbehorende productafbeeldings-URL's van de volgende standaard ingrediënten bij deze supermarkten: ${stores.join(', ')}.

Ingrediënten: ${ingredients.join(', ')}

Geef de data UITSLUITEND terug als een geldige JSON-map (zonder uitleg, zonder markdown) waarbij elke sleutel de exacte ingrediëntnaam is en de waarde een object met:
- "price" (number, reguliere prijs in euro's)
- "image_url" (string met product-afbeelding URL, of null)

Ga NIET zelf rekenen; geef alleen losse prijzen.`;

  return await generateGroundedJson<PriceMap>({ prompt, model: GEMINI_FLASH_LITE });
}

export { MAX_SHOPPER_CALLS };
