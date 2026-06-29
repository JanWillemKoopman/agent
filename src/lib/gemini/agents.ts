import {
  generateStructured,
  generateGroundedJson,
  GEMINI_FLASH,
  GEMINI_PRO,
} from './client';
import { chefResponseSchema, criticResponseSchema } from './schemas';
import type { Deal, RecipeConcept, PriceMap } from '../types';

// ---------------------------------------------------------------------------
// Stap 1 — The Foragers (Gemini + google_search). Eén call per winkel.
// ---------------------------------------------------------------------------
export async function forageDeals(store: string): Promise<Deal[]> {
  const prompt = `Zoek naar de top 15 beste actuele supermarktaanbiedingen van deze week voor ${store} in Nederland, specifiek in de categorieën verse groenten, vlees, vis en vegetarische vervangers.

Geef de resultaten UITSLUITEND terug als een geldige JSON array (zonder uitleg, zonder markdown) waarin elk element deze velden heeft:
- "product_name" (string)
- "deal_price" (number, in euro's)
- "original_price" (number of null, in euro's)
- "supermarket" (string, gebruik exact "${store}")`;

  // Flash: snel parallel scouten van aanbiedingen.
  const deals = await generateGroundedJson<Deal[]>({ prompt, model: GEMINI_FLASH });
  return Array.isArray(deals)
    ? deals.map((d) => ({ ...d, supermarket: d.supermarket || store }))
    : [];
}

// ---------------------------------------------------------------------------
// Stap 2 — The Chefs (Mixture of Experts, geen search). Parallelle persona's.
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
];

export async function chefRecipes(
  persona: ChefPersona,
  deals: Deal[]
): Promise<RecipeConcept[]> {
  const prompt = `Hier is de complete lijst met huidige supermarktaanbiedingen (JSON):
${JSON.stringify(deals)}

Bedenk de recepten volgens jouw specialisatie. Geef voor elk recept terug:
- "recipe_name"
- "description": één korte, smakelijke zin
- "base_deal_ingredients": welke aanbiedingen uit de lijst je gebruikt
- "required_standard_ingredients": welke reguliere (niet-aanbieding) producten nog nodig zijn
- "instructions": de volledige bereiding als array van duidelijke stappen (5 tot 8 korte stappen) voor 4 personen`;

  // Pro: culinaire kwaliteit bij het bedenken van recepten.
  const result = await generateStructured<{ recipes: RecipeConcept[] }>({
    systemInstruction: persona.systemInstruction,
    prompt,
    responseSchema: chefResponseSchema,
    model: GEMINI_PRO,
  });
  return result.recipes ?? [];
}

// ---------------------------------------------------------------------------
// Stap 3 — The Critic (kwaliteitscontrole, geen search). Eén call.
// ---------------------------------------------------------------------------
export async function criticFilter(
  concepts: RecipeConcept[]
): Promise<RecipeConcept[]> {
  const prompt = `Beoordeel deze lijst met receptconcepten als een professionele chef en diëtist. Verwijder recepten die culinair niet kloppen, ongezond zijn, of te complex zijn voor een thuiskok. Behoud de beste 8 recepten en geef deze terug.

Behoud per recept ALLE velden ongewijzigd, inclusief de volledige "instructions" (bereidingsstappen). Verbeter onduidelijke of incomplete stappen waar nodig, maar laat ze nooit weg.

Receptconcepten (JSON):
${JSON.stringify(concepts)}`;

  // Pro: scherpe kwaliteitsbeoordeling door de Critic.
  const result = await generateStructured<{ recipes: RecipeConcept[] }>({
    systemInstruction:
      'Je bent een strenge maar eerlijke culinair criticus en diëtist. Behoud uitsluitend de beste, gezonde en haalbare recepten (maximaal 8).',
    prompt,
    responseSchema: criticResponseSchema,
    model: GEMINI_PRO,
  });
  return (result.recipes ?? []).slice(0, 8);
}

// ---------------------------------------------------------------------------
// Stap 4 — The Shoppers (Gemini + google_search). Per chunk van recepten.
// ---------------------------------------------------------------------------
export async function shopPrices(
  recipesChunk: RecipeConcept[],
  stores: string[]
): Promise<PriceMap> {
  // Verzamel de unieke standaardingrediënten die we nog moeten beprijzen.
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

  // Flash: snel reguliere prijzen + afbeeldingen ophalen.
  return await generateGroundedJson<PriceMap>({ prompt, model: GEMINI_FLASH });
}
