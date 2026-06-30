/**
 * Forager v2 — Data Collector Architecture
 *
 * Missie: verzamel een zo compleet mogelijke dataset van weekaanbiedingen.
 * Niet snel, maar volledig. Kwaliteit gaat vóór snelheid.
 *
 * Architectuur (5 fasen):
 *   Fase 1 — Brede zoekstrategieën (5 parallelle calls)
 *   Fase 2 — Categoriespecifieke zoekstrategieën (13 parallelle calls)
 *   Fase 3 — Samenvoegen + fuzzy deduplicatie
 *   Fase 4 — Coverage analyse
 *   Fase 5 — Recovery: gerichte herstelronden voor ontbrekende categorieën
 */

import { generateGroundedJson, GEMINI_FLASH_LITE } from './client';
import type { Deal } from '../types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SearchStrategy {
  name: string;
  buildPrompt: (store: string, urlHint: string, excludeNames: string[]) => string;
}

export interface CoverageReport {
  totalProducts: number;
  categoriesFound: string[];
  categoriesMissing: string[];
  dealsWithPrice: number;
  dealsWithDealType: number;
  confidenceScore: number;
}

// ---------------------------------------------------------------------------
// Constanten
// ---------------------------------------------------------------------------

const MAX_RECOVERY_ROUNDS = 3;
const MAX_RECOVERY_CATEGORIES_PER_ROUND = 5;

export const STORE_DEALS_URLS: Record<string, string> = {
  'Albert Heijn': 'https://www.ah.nl/bonus',
  'Jumbo': 'https://www.jumbo.com/aanbiedingen/nu',
  'Aldi': 'https://www.aldi.nl/aanbiedingen-deze-week.html',
};

export const STORE_SEARCH_HINTS: Record<string, string> = {
  'Plus':
    'Zoek via Google Search naar "Plus supermarkt weekaanbiedingen" of "plus.nl aanbiedingen deze week". ' +
    'Probeer ook "site:plus.nl aanbiedingen" voor directe productvermeldingen.',
  'Lidl':
    'Zoek via Google Search naar de huidige aanbiedingspagina van Lidl Nederland (de URL wijzigt wekelijks). ' +
    'Probeer "Lidl Nederland weekaanbiedingen" of "lidl.nl aanbiedingen".',
};

// Categorieën die de Coverage Engine controleert.
const PRODUCT_CATEGORIES: string[] = [
  'Groente',
  'Fruit',
  'Vlees',
  'Vis',
  'Vegetarisch & Vegan',
  'Zuivel',
  'Kaas',
  'Brood & Bakkerij',
  'Diepvries',
  'Pasta, Rijst & Granen',
  'Sauzen & Conserven',
  'Wereldkeuken',
  'Dranken',
  'Snacks & Tussendoor',
  'Ontbijt & Koffie',
];

// Trefwoorden per categorie voor de Coverage Engine.
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Groente': [
    'groente', 'paprika', 'tomaat', 'komkommer', 'sla', 'wortel', 'broccoli',
    'spinazie', 'courgette', 'prei', 'ui', 'knolselderij', 'biet', 'pompoen',
    'bloemkool', 'spruitjes', 'andijvie', 'champignon', 'asperge', 'avocado',
  ],
  'Fruit': [
    'fruit', 'appel', 'peer', 'banaan', 'sinaasappel', 'mandarijn', 'druif',
    'aardbei', 'bosbes', 'framboos', 'mango', 'ananas', 'meloen', 'kiwi',
    'citroen', 'limoen', 'pruim', 'perzik', 'nectarine', 'watermeloen',
  ],
  'Vlees': [
    'kipfilet', 'kip', 'gehakt', 'biefstuk', 'entrecote', 'rundvlees',
    'varkensvlees', 'kalkoen', 'lamsvlees', 'ham', 'spek', 'worst', 'rookworst',
    'braadworst', 'schnitzels', 'slavink', 'fricandeau', 'ribstuk', 'rosbief',
  ],
  'Vis': [
    'zalm', 'kabeljauw', 'tilapia', 'garnalen', 'tonijn', 'haring', 'makreel',
    'forel', 'pangasius', 'mosselen', 'inktvis', 'zeevruchten', 'vissticks',
    'gerookte vis', 'sardines',
  ],
  'Vegetarisch & Vegan': [
    'tofu', 'tempeh', 'quorn', 'vleesvervangers', 'veggie', 'vegan', 'vegetarisch',
    'soja', 'linzen', 'kikkererwten', 'bonen', 'plantaardig', 'vegetarian',
    'hummus', 'falafel',
  ],
  'Zuivel': [
    'melk', 'yoghurt', 'kwark', 'vla', 'slagroom', 'room', 'crème fraîche',
    'boter', 'halfvolle melk', 'volle melk', 'sojamelk', 'havermelk',
    'amandelmelk', 'karnemelk',
  ],
  'Kaas': [
    'kaas', 'gouda', 'edam', 'brie', 'camembert', 'feta', 'mozzarella',
    'parmezan', 'grana padano', 'smeerkaas', 'roomkaas', 'cheddar', 'emmentaler',
  ],
  'Brood & Bakkerij': [
    'brood', 'croissant', 'broodje', 'baguette', 'beschuit', 'crackers',
    'ontbijtkoek', 'wrap', 'tortilla', 'ciabatta', 'pistolet', 'volkoren',
    'meergranen',
  ],
  'Diepvries': [
    'diepvries', 'ingevroren', 'bevroren', 'frozen', 'friet', 'frites',
    'ijs', 'ijsje', 'diepvriespizza', 'diepvriesgroenten',
  ],
  'Pasta, Rijst & Granen': [
    'pasta', 'spaghetti', 'penne', 'fusilli', 'farfalle', 'lasagne', 'tagliatelle',
    'rijst', 'zilvervliesrijst', 'basmati', 'jasmine', 'couscous', 'quinoa',
    'bulgur', 'havermout', 'bloem', 'meel',
  ],
  'Sauzen & Conserven': [
    'saus', 'pastasaus', 'bolognese', 'tomatenblokjes', 'tomatenpuree', 'ketchup',
    'mayonaise', 'pesto', 'mosterd', 'sambal', 'ketjap', 'olijfolie',
    'bonen uit blik', 'ingeblikte', 'conserven',
  ],
  'Wereldkeuken': [
    'nasi', 'bami', 'curry', 'wok', 'mexicaans', 'indiaas', 'thais',
    'aziatisch', 'italiaans', 'grieks', 'ketjap', 'kokosmelk', 'tacos',
    'burrito', 'sushi', 'wokgroenten',
  ],
  'Dranken': [
    'frisdrank', 'cola', 'fanta', 'sprite', 'sap', 'appelsap', 'sinaasappelsap',
    'water', 'mineraalwater', 'bier', 'wijn', 'limonade', 'sportdrank',
    'energiedrank', 'ijsthee',
  ],
  'Snacks & Tussendoor': [
    'chips', 'nootjes', 'chocolade', 'koekjes', 'koek', 'snoep', 'popcorn',
    'repen', 'tussendoor', 'snack', 'crackers', 'rijstwafels', 'mueslireep',
  ],
  'Ontbijt & Koffie': [
    'cornflakes', 'muesli', 'granola', 'ontbijtgranen', 'jam', 'pindakaas',
    'hagelslag', 'pasta ontbijt', 'koffie', 'thee', 'espresso', 'cappuccino',
    'nespresso', 'dolce gusto', 'senseo', 'koffiecups', 'theezakjes',
  ],
};

// ---------------------------------------------------------------------------
// Hulpfuncties
// ---------------------------------------------------------------------------

function normalize(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.\-,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Fuzzy similarity: twee productnamen zijn hetzelfde als de Jaccard-overlap
 * van betekenisvolle woorden (>3 tekens) groter dan 0.65 is, of als de ene
 * naam de andere bevat (voor afgekorte variant-namen).
 */
function areSimilar(a: string, b: string): boolean {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return true;

  // Containment check (bv. "AH Kipfilet" ↔ "AH Kipfilet 600g")
  const shorter = na.length < nb.length ? na : nb;
  const longer = na.length < nb.length ? nb : na;
  if (longer.includes(shorter) && shorter.length > 6) return true;

  // Jaccard over woorden langer dan 3 tekens
  const wordsA = new Set(na.split(' ').filter((w) => w.length > 3));
  const wordsB = new Set(nb.split(' ').filter((w) => w.length > 3));
  if (wordsA.size === 0 || wordsB.size === 0) return false;

  const intersection = [...wordsA].filter((w) => wordsB.has(w));
  const union = new Set([...wordsA, ...wordsB]);
  return intersection.length / union.size > 0.65;
}

function deduplicateDeals(deals: Deal[]): Deal[] {
  const unique: Deal[] = [];
  for (const deal of deals) {
    const isDuplicate = unique.some((existing) =>
      areSimilar(existing.product_name, deal.product_name)
    );
    if (!isDuplicate) unique.push(deal);
  }
  return unique;
}

function qualityFilter(deals: Deal[]): Deal[] {
  return deals.filter((d) => {
    if (!d.product_name || d.product_name.trim().length < 3) return false;
    if (typeof d.deal_price !== 'number' || d.deal_price < 0) return false;
    if (!['single', 'bogo', 'multi_buy', 'percentage_off'].includes(d.deal_type)) return false;
    // Vreemde hoeveelheden
    const qty = Number(d.min_quantity);
    if (!Number.isInteger(qty) || qty < 1) return false;
    if ((d.deal_type === 'bogo' || d.deal_type === 'multi_buy') && qty < 2) return false;
    if (d.bundle_price !== null && d.bundle_price !== undefined && d.bundle_price <= 0) return false;
    return true;
  });
}

function buildUrlHint(store: string): string {
  if (STORE_DEALS_URLS[store]) {
    return `Raadpleeg de aanbiedingspagina op ${STORE_DEALS_URLS[store]} en gebruik Google Search om de meest actuele aanbiedingen te vinden.`;
  }
  if (STORE_SEARCH_HINTS[store]) {
    return STORE_SEARCH_HINTS[store];
  }
  return `Zoek via Google Search naar de huidige aanbiedingspagina van ${store} Nederland en haal daar de aanbiedingen vandaan.`;
}

// ---------------------------------------------------------------------------
// JSON-schema instructies (gedeeld door alle strategieprompts)
// ---------------------------------------------------------------------------

function jsonSchema(store: string): string {
  return `Geef de resultaten UITSLUITEND terug als een geldige JSON array (zonder uitleg, zonder markdown) waarbij elk element deze velden heeft:
- "product_name" (string: de officiële productnaam exact zoals vermeld, inclusief merk en gewicht/volume — bv. "AH Kipfilet 600g", "Jumbo Halfvolle melk 1L", "Aldi Verse zalm 2 stuks 300g")
- "deal_type" (string: exact één van: "single", "bogo", "multi_buy", "percentage_off")
  • single = losse prijs-aanbieding (bv. "nu €1,99")
  • bogo = 2e gratis (koop 2, betaal 1)
  • multi_buy = bundeldeal (bv. "2 voor €5", "3 voor €4")
  • percentage_off = procentuele korting (bv. "50% korting")
- "min_quantity" (number: minimaal te kopen stuks; 1 bij single of percentage_off, 2+ bij bogo/multi_buy)
- "bundle_price" (number of null: totale kassaprijs voor min_quantity stuks; null bij single of percentage_off)
- "deal_price" (number: effectieve prijs per eenheid = bundle_price / min_quantity; bij single/percentage_off = de aanbiedings-stukprijs)
- "original_price" (number of null: reguliere stukprijs vóór de aanbieding, of null als onbekend)
- "deal_description" (string of null: exacte tekst zoals op de website, bv. "2e gratis", "2 voor €5,00", "50% korting")
- "supermarket" (string: gebruik exact "${store}")`;
}

function exclusionNote(excludeNames: string[], max = 50): string {
  if (excludeNames.length === 0) return '';
  const listed = excludeNames.slice(0, max).join(', ');
  return `\n\nAl gevonden producten — geef deze NIET nogmaals terug:\n${listed}\n\nZoek uitsluitend naar ANDERE aanbiedingen.`;
}

// ---------------------------------------------------------------------------
// Fase 1 — Brede zoekstrategieën
// ---------------------------------------------------------------------------

const BROAD_STRATEGIES: SearchStrategy[] = [
  {
    name: 'Alle aanbiedingen',
    buildPrompt: (store, urlHint, exclude) => `
Zoek ALLE actuele weekaanbiedingen van ${store} in Nederland — over alle categorieën heen.

${urlHint}${exclusionNote(exclude)}

Verzamel minimaal 20 producten. Sla geen categorie over.

${jsonSchema(store)}`.trim(),
  },
  {
    name: 'Bonus & Speciale acties',
    buildPrompt: (store, urlHint, exclude) => `
Zoek uitsluitend Bonus-acties, speciale aanbiedingen en wekelijkse deals van ${store} in Nederland die alleen deze week gelden.

${urlHint}${exclusionNote(exclude)}

${jsonSchema(store)}`.trim(),
  },
  {
    name: 'Weekfolder producten',
    buildPrompt: (store, urlHint, exclude) => `
Zoek alle producten die in de actuele weekfolder of het weekmenu van ${store} in Nederland staan.

${urlHint}${exclusionNote(exclude)}

Neem alle productcategorieën mee — groenten, vlees, vis, zuivel, dranken, verzorging, huishouden, enzovoort.

${jsonSchema(store)}`.trim(),
  },
  {
    name: 'Combinatiedeals',
    buildPrompt: (store, urlHint, exclude) => `
Zoek producten met combinatiedeals bij ${store} in Nederland: 1+1 gratis, 2e halve prijs, 3 voor de prijs van 2, 2 voor €X.

${urlHint}${exclusionNote(exclude)}

${jsonSchema(store)}`.trim(),
  },
  {
    name: 'Procentuele kortingen',
    buildPrompt: (store, urlHint, exclude) => `
Zoek producten met procentuele kortingen bij ${store} in Nederland: 20% korting, 25% korting, 30% korting, 40% korting, 50% korting of meer.

${urlHint}${exclusionNote(exclude)}

${jsonSchema(store)}`.trim(),
  },
];

// ---------------------------------------------------------------------------
// Fase 2 — Categoriespecifieke zoekstrategieën
// ---------------------------------------------------------------------------

const CATEGORY_STRATEGIES: SearchStrategy[] = [
  {
    name: 'Groente',
    buildPrompt: (store, urlHint, exclude) => `
Zoek uitsluitend verse groenten die deze week in de aanbieding zijn bij ${store} in Nederland.

${urlHint}${exclusionNote(exclude)}

Denk aan: paprika, tomaat, komkommer, sla, wortel, broccoli, spinazie, courgette, prei, ui, bloemkool, spruitjes, champignons.

${jsonSchema(store)}`.trim(),
  },
  {
    name: 'Fruit',
    buildPrompt: (store, urlHint, exclude) => `
Zoek uitsluitend verse fruitsoorten die deze week in de aanbieding zijn bij ${store} in Nederland.

${urlHint}${exclusionNote(exclude)}

Denk aan: appels, peren, bananen, sinaasappels, mandarijnen, druiven, aardbeien, bosbes, mango, ananas, watermeloen.

${jsonSchema(store)}`.trim(),
  },
  {
    name: 'Vlees & Gevogelte',
    buildPrompt: (store, urlHint, exclude) => `
Zoek uitsluitend vleesproducten en gevogelte die deze week in de aanbieding zijn bij ${store} in Nederland.

${urlHint}${exclusionNote(exclude)}

Denk aan: kipfilet, kippendijen, gehakt, biefstuk, entrecôte, varkenshaas, kalkoen, ham, spek, worst, schnitzels.

${jsonSchema(store)}`.trim(),
  },
  {
    name: 'Vis & Zeevruchten',
    buildPrompt: (store, urlHint, exclude) => `
Zoek uitsluitend vis en zeevruchten die deze week in de aanbieding zijn bij ${store} in Nederland.

${urlHint}${exclusionNote(exclude)}

Denk aan: zalm, kabeljauw, tilapia, garnalen, tonijn, haring, makreel, forel, mosselen, vissticks.

${jsonSchema(store)}`.trim(),
  },
  {
    name: 'Vegetarisch & Vegan',
    buildPrompt: (store, urlHint, exclude) => `
Zoek uitsluitend vegetarische en vegan producten die deze week in de aanbieding zijn bij ${store} in Nederland.

${urlHint}${exclusionNote(exclude)}

Denk aan: tofu, tempeh, Quorn, vleesvervangers, plantaardige melk, vegan kaas, hummus, falafel, linzen, kikkererwten.

${jsonSchema(store)}`.trim(),
  },
  {
    name: 'Zuivel & Eieren',
    buildPrompt: (store, urlHint, exclude) => `
Zoek uitsluitend zuivelproducten en eieren die deze week in de aanbieding zijn bij ${store} in Nederland.

${urlHint}${exclusionNote(exclude)}

Denk aan: melk (halfvol, vol, mager), yoghurt, kwark, vla, slagroom, crème fraîche, boter, eieren.

${jsonSchema(store)}`.trim(),
  },
  {
    name: 'Kaas',
    buildPrompt: (store, urlHint, exclude) => `
Zoek uitsluitend kaasproducten die deze week in de aanbieding zijn bij ${store} in Nederland.

${urlHint}${exclusionNote(exclude)}

Denk aan: Gouda, Edam, Brie, Camembert, Feta, Mozzarella, smeerkaas, roomkaas, Parmezaan, Grana Padano.

${jsonSchema(store)}`.trim(),
  },
  {
    name: 'Brood & Bakkerij',
    buildPrompt: (store, urlHint, exclude) => `
Zoek uitsluitend brood en bakkerijproducten die deze week in de aanbieding zijn bij ${store} in Nederland.

${urlHint}${exclusionNote(exclude)}

Denk aan: volkoren brood, meergranen, wit brood, croissants, baguette, beschuit, crackers, wraps, ontbijtkoek.

${jsonSchema(store)}`.trim(),
  },
  {
    name: 'Diepvries',
    buildPrompt: (store, urlHint, exclude) => `
Zoek uitsluitend diepvriesproducten die deze week in de aanbieding zijn bij ${store} in Nederland.

${urlHint}${exclusionNote(exclude)}

Denk aan: diepvriesgroenten, friet, diepvriespizza, ijs, diepvries maaltijden, diepvries vis, soep.

${jsonSchema(store)}`.trim(),
  },
  {
    name: 'Pasta, Rijst & Granen',
    buildPrompt: (store, urlHint, exclude) => `
Zoek uitsluitend pasta, rijst en graanproducten die deze week in de aanbieding zijn bij ${store} in Nederland.

${urlHint}${exclusionNote(exclude)}

Denk aan: spaghetti, penne, fusilli, lasagne, rijst, zilvervliesrijst, basmati, couscous, quinoa, bulgur, havermout.

${jsonSchema(store)}`.trim(),
  },
  {
    name: 'Sauzen & Conserven',
    buildPrompt: (store, urlHint, exclude) => `
Zoek uitsluitend sauzen, conserven en ingeblikte producten die deze week in de aanbieding zijn bij ${store} in Nederland.

${urlHint}${exclusionNote(exclude)}

Denk aan: pastasaus, tomatenpuree, tomatenblokjes, ketchup, mayonaise, pesto, olijfolie, bonen uit blik, kikkererwten uit blik.

${jsonSchema(store)}`.trim(),
  },
  {
    name: 'Dranken',
    buildPrompt: (store, urlHint, exclude) => `
Zoek uitsluitend dranken die deze week in de aanbieding zijn bij ${store} in Nederland.

${urlHint}${exclusionNote(exclude)}

Denk aan: frisdrank, cola, sap, water, bier, wijn, limonade, sportdranken, ijsthee, energiedranken.

${jsonSchema(store)}`.trim(),
  },
  {
    name: 'Snacks & Tussendoor',
    buildPrompt: (store, urlHint, exclude) => `
Zoek uitsluitend snacks en tussendoor-producten die deze week in de aanbieding zijn bij ${store} in Nederland.

${urlHint}${exclusionNote(exclude)}

Denk aan: chips, nootjes, chocolade, koekjes, snoep, popcorn, repen, rijstwafels, mueslirepen.

${jsonSchema(store)}`.trim(),
  },
  {
    name: 'Ontbijt & Koffie',
    buildPrompt: (store, urlHint, exclude) => `
Zoek uitsluitend ontbijtproducten, koffie en thee die deze week in de aanbieding zijn bij ${store} in Nederland.

${urlHint}${exclusionNote(exclude)}

Denk aan: cornflakes, muesli, granola, jam, pindakaas, hagelslag, koffiecups, koffie, thee, espresso.

${jsonSchema(store)}`.trim(),
  },
];

// ---------------------------------------------------------------------------
// Strategie uitvoeren
// ---------------------------------------------------------------------------

async function runStrategy(
  strategy: SearchStrategy,
  store: string,
  urlHint: string,
  excludeNames: string[]
): Promise<Deal[]> {
  const prompt = strategy.buildPrompt(store, urlHint, excludeNames);
  try {
    const raw = await generateGroundedJson<Deal[]>({ prompt, model: GEMINI_FLASH_LITE });
    const batch = Array.isArray(raw) ? raw : [];
    return batch.map((d) => ({ ...d, supermarket: d.supermarket || store }));
  } catch (err) {
    console.error(`[Forager] Strategie "${strategy.name}" voor ${store} faalde:`, err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Coverage Engine
// ---------------------------------------------------------------------------

function detectCategories(deals: Deal[]): string[] {
  const dealNames = deals.map((d) => d.product_name.toLowerCase());
  return PRODUCT_CATEGORIES.filter((cat) => {
    const keywords = CATEGORY_KEYWORDS[cat] ?? [];
    return keywords.some((kw) => dealNames.some((name) => name.includes(kw)));
  });
}

function analyzeCoverage(deals: Deal[]): CoverageReport {
  const categoriesFound = detectCategories(deals);
  const categoriesMissing = PRODUCT_CATEGORIES.filter(
    (c) => !categoriesFound.includes(c)
  );
  const dealsWithPrice = deals.filter(
    (d) => typeof d.deal_price === 'number' && d.deal_price > 0
  ).length;
  const dealsWithDealType = deals.filter((d) =>
    ['single', 'bogo', 'multi_buy', 'percentage_off'].includes(d.deal_type)
  ).length;

  const categoryScore = (categoriesFound.length / PRODUCT_CATEGORIES.length) * 70;
  const priceScore = deals.length > 0 ? (dealsWithPrice / deals.length) * 20 : 0;
  const countScore = Math.min(deals.length / 100, 1) * 10;
  const confidenceScore = Math.round(categoryScore + priceScore + countScore);

  return {
    totalProducts: deals.length,
    categoriesFound,
    categoriesMissing,
    dealsWithPrice,
    dealsWithDealType,
    confidenceScore,
  };
}

// ---------------------------------------------------------------------------
// Recovery strategieën voor ontbrekende categorieën
// ---------------------------------------------------------------------------

function buildRecoveryStrategy(category: string): SearchStrategy {
  const keywords = (CATEGORY_KEYWORDS[category] ?? []).slice(0, 8).join(', ');
  return {
    name: `Recovery: ${category}`,
    buildPrompt: (store, urlHint, exclude) => `
Zoek uitsluitend ${category} producten die deze week in de aanbieding zijn bij ${store} in Nederland.

${urlHint}${exclusionNote(exclude, 30)}

${keywords ? `Zoek specifiek naar: ${keywords}.` : ''}

${jsonSchema(store)}`.trim(),
  };
}

// ---------------------------------------------------------------------------
// Exporteerbaar resultaattype inclusief metrics
// ---------------------------------------------------------------------------

export interface ForagerResult {
  deals: Deal[];
  coverage: CoverageReport;
  aiCallsMade: number;
  durationMs: number;
  duplicatesRemoved: number;
}

// ---------------------------------------------------------------------------
// Interne implementatie
// ---------------------------------------------------------------------------

async function runForager(store: string): Promise<ForagerResult> {
  const startMs = Date.now();
  const urlHint = buildUrlHint(store);
  let aiCallsMade = 0;
  let totalRaw = 0;

  console.log(`[Forager] ▶ Start voor ${store}`);

  // ── Fase 1: Brede zoekstrategieën (parallel) ──────────────────────────────
  console.log(`[Forager] Fase 1: ${BROAD_STRATEGIES.length} brede strategieën parallel voor ${store}`);
  aiCallsMade += BROAD_STRATEGIES.length;

  const broadResults = await Promise.allSettled(
    BROAD_STRATEGIES.map((s) => runStrategy(s, store, urlHint, []))
  );
  let rawDeals: Deal[] = broadResults.flatMap((r) =>
    r.status === 'fulfilled' ? r.value : []
  );
  totalRaw += rawDeals.length;
  let allDeals = deduplicateDeals(qualityFilter(rawDeals));
  console.log(`[Forager] Na fase 1: ${allDeals.length} unieke producten (${rawDeals.length} ruw) voor ${store}`);

  // ── Fase 2: Categoriespecifieke zoekstrategieën (parallel) ────────────────
  console.log(`[Forager] Fase 2: ${CATEGORY_STRATEGIES.length} categoriestrategieën parallel voor ${store}`);
  aiCallsMade += CATEGORY_STRATEGIES.length;

  const excludeAfterPhase1 = allDeals.map((d) => d.product_name);
  const categoryResults = await Promise.allSettled(
    CATEGORY_STRATEGIES.map((s) => runStrategy(s, store, urlHint, excludeAfterPhase1))
  );
  const categoryRaw: Deal[] = categoryResults.flatMap((r) =>
    r.status === 'fulfilled' ? r.value : []
  );
  totalRaw += categoryRaw.length;
  allDeals = deduplicateDeals([...allDeals, ...qualityFilter(categoryRaw)]);
  console.log(`[Forager] Na fase 2: ${allDeals.length} unieke producten (${categoryRaw.length} ruw) voor ${store}`);

  // ── Fase 3: Coverage analyse ──────────────────────────────────────────────
  let coverage = analyzeCoverage(allDeals);
  console.log(
    `[Forager] Coverage voor ${store}: ${coverage.confidenceScore}% ` +
    `(${coverage.categoriesFound.length}/${PRODUCT_CATEGORIES.length} categorieën)`
  );
  if (coverage.categoriesMissing.length > 0) {
    console.log(`[Forager] Ontbrekende categorieën: ${coverage.categoriesMissing.join(', ')}`);
  }

  // ── Fase 4: Recovery rounds voor ontbrekende categorieën ─────────────────
  for (let round = 1; round <= MAX_RECOVERY_ROUNDS; round++) {
    if (coverage.categoriesMissing.length === 0) break;

    const missing = coverage.categoriesMissing.slice(0, MAX_RECOVERY_CATEGORIES_PER_ROUND);
    console.log(
      `[Forager] Recovery ronde ${round}: ${missing.length} categorieën voor ${store} (${missing.join(', ')})`
    );
    aiCallsMade += missing.length;

    const currentExclude = allDeals.map((d) => d.product_name);
    const recoveryStrategies = missing.map(buildRecoveryStrategy);
    const recoveryResults = await Promise.allSettled(
      recoveryStrategies.map((s) => runStrategy(s, store, urlHint, currentExclude))
    );
    const recoveryRaw: Deal[] = recoveryResults.flatMap((r) =>
      r.status === 'fulfilled' ? r.value : []
    );
    totalRaw += recoveryRaw.length;

    if (recoveryRaw.length === 0) {
      console.log(`[Forager] Recovery ronde ${round}: geen nieuwe producten, stop.`);
      break;
    }

    allDeals = deduplicateDeals([...allDeals, ...qualityFilter(recoveryRaw)]);
    coverage = analyzeCoverage(allDeals);
    console.log(
      `[Forager] Na recovery ronde ${round}: ${allDeals.length} producten, coverage ${coverage.confidenceScore}%`
    );
  }

  const durationMs = Date.now() - startMs;
  const duplicatesRemoved = totalRaw - allDeals.length;

  console.log(
    `[Forager] ✓ Klaar voor ${store}: ${allDeals.length} producten, ` +
    `confidence ${coverage.confidenceScore}%, ` +
    `${coverage.categoriesFound.length}/${PRODUCT_CATEGORIES.length} categorieën, ` +
    `${duplicatesRemoved} duplicaten verwijderd, ` +
    `${aiCallsMade} AI-calls, ${Math.round(durationMs / 1000)}s`
  );

  return { deals: allDeals, coverage, aiCallsMade, durationMs, duplicatesRemoved };
}

// ---------------------------------------------------------------------------
// Exportfuncties
// ---------------------------------------------------------------------------

/** Volledige forager-run met metrics. Gebruik dit in scrapeStore voor opslag. */
export async function forageDealsWithMetrics(store: string): Promise<ForagerResult> {
  return runForager(store);
}

/** Backward-compatibele wrapper die alleen de deals teruggeeft. */
export async function forageDeals(store: string): Promise<Deal[]> {
  const result = await runForager(store);
  return result.deals;
}
