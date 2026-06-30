/**
 * Forager v3 — Data Collector Architecture
 *
 * Missie: verzamel een zo compleet mogelijke dataset van avondeten-relevante
 * weekaanbiedingen. Volledigheid gaat vóór snelheid.
 *
 * Architectuur (6 fasen):
 *   Fase 1 — Brede zoekstrategieën (7 parallelle calls)
 *   Fase 2 — Categoriespecifieke zoekstrategieën (18 parallelle calls)
 *   Fase 3 — Samenvoegen + fuzzy deduplicatie
 *   Fase 4 — Coverage analyse
 *   Fase 5 — Recovery: gerichte herstelronden voor ontbrekende categorieën
 *   Fase 6 — Gap-analyse: Gemini zoekt wat we nog missen
 */

import { generateGroundedJson, GEMINI_CHEF } from './client';
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

// Houd recovery beperkt: elke ronde kost ~5s serieel en edge-functies hebben
// een timeout van ~30-60s. Fase 1+2 kost al ~10s, dus max 2 rondes is veilig.
const MAX_RECOVERY_ROUNDS = 2;
const MAX_RECOVERY_CATEGORIES_PER_ROUND = 6;

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

// Avondeten-gerichte categorieën voor de Coverage Engine (18 categorieën).
const PRODUCT_CATEGORIES: string[] = [
  'Groente',
  'Fruit',
  'Aardappelen',
  'Kip & Gevogelte',
  'Rund & Varkensvlees',
  'Vis',
  'Zeevruchten',
  'Vegetarisch & Vegan',
  'Peulvruchten',
  'Zuivel & Eieren',
  'Kaas',
  'Diepvries',
  'Pasta, Rijst & Granen',
  'Sauzen & Conserven',
  'Soepen & Bouillon',
  'Wok & Wereldkeuken',
  'Vleeswaren & Deli',
  'Kant-en-klaar',
];

// Trefwoorden per categorie voor de Coverage Engine.
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Groente': [
    'groente', 'paprika', 'tomaat', 'komkommer', 'sla', 'wortel', 'broccoli',
    'spinazie', 'courgette', 'prei', 'ui', 'knolselderij', 'biet', 'pompoen',
    'bloemkool', 'spruitjes', 'andijvie', 'champignon', 'asperge', 'avocado',
    'venkel', 'selderij', 'radijs', 'mais', 'peultjes', 'sugarsnap', 'paksoi',
  ],
  'Fruit': [
    'fruit', 'appel', 'peer', 'banaan', 'sinaasappel', 'mandarijn', 'druif',
    'aardbei', 'bosbes', 'framboos', 'mango', 'ananas', 'meloen', 'kiwi',
    'citroen', 'limoen', 'pruim', 'perzik', 'nectarine', 'watermeloen', 'vijg',
  ],
  'Aardappelen': [
    'aardappel', 'krieltjes', 'zoete aardappel', 'bataat', 'friet', 'frites',
    'frietjes', 'aardappelpuree', 'roosteraardappel', 'ketelchips',
  ],
  'Kip & Gevogelte': [
    'kip', 'kipfilet', 'kippendijen', 'kipdijfilet', 'drumstick', 'kippendrum',
    'kippenvleugels', 'kipschnitzels', 'kalkoen', 'eend', 'gevogelte',
    'kipgehakt', 'kip heel', 'hele kip',
  ],
  'Rund & Varkensvlees': [
    'gehakt', 'biefstuk', 'entrecote', 'rundvlees', 'varkensvlees', 'varkenshaas',
    'ribstuk', 'rosbief', 'slavink', 'schnitzels', 'ribben', 'karbonade',
    'sukadelap', 'draadjesvlees', 'procureur', 'burgers', 'hamburger',
  ],
  'Vis': [
    'zalm', 'kabeljauw', 'tilapia', 'tonijn', 'haring', 'makreel', 'forel',
    'pangasius', 'vissticks', 'gerookte vis', 'sardines', 'witvis', 'zeebaars',
    'dorade', 'vis ', ' vis', 'visfilet',
  ],
  'Zeevruchten': [
    'garnalen', 'mosselen', 'inktvis', 'zeevruchten', 'kreeft', 'krab',
    'oesters', 'sint-jakobsschelp', 'langoustines', 'calamari', 'octopus',
  ],
  'Vegetarisch & Vegan': [
    'tofu', 'tempeh', 'quorn', 'vleesvervangers', 'veggie', 'vegan', 'vegetarisch',
    'soja', 'plantaardig', 'vegetarian', 'hummus', 'falafel', 'seitan',
    'tofoe', 'haverburger', 'vegaburger',
  ],
  'Peulvruchten': [
    'linzen', 'kikkererwten', 'bonen', 'kidneybonen', 'bruine bonen',
    'kapucijners', 'doperwten', 'spliterwten', 'zwarte bonen', 'edamame',
    'erwten', 'boontjes', 'sperziebonen', 'witte bonen',
  ],
  'Zuivel & Eieren': [
    'melk', 'yoghurt', 'kwark', 'vla', 'slagroom', 'room', 'crème fraîche',
    'boter', 'eieren', ' ei', 'karnemelk', 'halfvolle melk', 'volle melk',
    'sojamelk', 'havermelk', 'amandelmelk',
  ],
  'Kaas': [
    'kaas', 'gouda', 'edam', 'brie', 'camembert', 'feta', 'mozzarella',
    'parmezan', 'grana padano', 'smeerkaas', 'roomkaas', 'cheddar',
    'emmentaler', 'manchego', 'halloumi',
  ],
  'Diepvries': [
    'diepvries', 'ingevroren', 'bevroren', 'frozen', 'diepvriespizza',
    'diepvriesmaaltijd', 'diepvriesgroenten', 'ijs', 'ijsje',
  ],
  'Pasta, Rijst & Granen': [
    'pasta', 'spaghetti', 'penne', 'fusilli', 'farfalle', 'lasagne', 'tagliatelle',
    'rijst', 'zilvervliesrijst', 'basmati', 'jasmine', 'couscous', 'quinoa',
    'bulgur', 'havermout', 'bloem', 'meel', 'polenta', 'mie', 'noodles',
  ],
  'Sauzen & Conserven': [
    'saus', 'pastasaus', 'bolognese', 'tomatenblokjes', 'tomatenpuree', 'ketchup',
    'mayonaise', 'pesto', 'mosterd', 'sambal', 'ketjap', 'olijfolie', 'zonnebloemolie',
    'bonen uit blik', 'ingeblikte', 'conserven', 'azijn', 'marinade', 'kruidenmix',
    'tomatensaus', 'salsa', 'chilisaus', 'teriyaki',
  ],
  'Soepen & Bouillon': [
    'soep', 'bouillon', 'fond', 'tomatensoep', 'groentesoep', 'kippensoep',
    'bisque', 'soepblokje', 'kruidenbouillon', 'vleesbouillon', 'ramen', 'miso',
  ],
  'Wok & Wereldkeuken': [
    'nasi', 'bami', 'curry', 'wok', 'mexicaans', 'indiaas', 'thais', 'aziatisch',
    'italiaans', 'grieks', 'kokosmelk', 'tacos', 'burrito', 'sushi', 'wokgroenten',
    'shoarma', 'kebab', 'tikka', 'massaman', 'wrap', 'tortilla', 'pita', 'naan',
    'rendang', 'satay', 'saté',
  ],
  'Vleeswaren & Deli': [
    'ham', 'salami', 'rookvlees', 'chorizo', 'paté', 'smeerworst', 'vleeswaren',
    'prosciutto', 'cervelaat', 'mortadella', 'bacon', 'spek', 'rookham',
    'bresaola', 'coppa',
  ],
  'Kant-en-klaar': [
    'kant-en-klaar', 'maaltijdschotel', 'ovenschotel', 'stampot', 'maaltijdpakket',
    'verse maaltijd', 'kant en klaar', 'oven dish', 'maaltijdsalade',
    'wraps pakket', 'lasagne kant',
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


function deduplicateDeals(deals: Deal[]): Deal[] {
  const seen = new Set<string>();
  const unique: Deal[] = [];
  for (const deal of deals) {
    const key = `${deal.supermarket}||${normalize(deal.product_name)}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(deal);
    }
  }
  return unique;
}

function qualityFilter(deals: Deal[]): Deal[] {
  return deals.filter((d) => {
    if (!d.product_name || d.product_name.trim().length < 3) return false;
    if (typeof d.deal_price !== 'number' || d.deal_price < 0) return false;
    if (!['single', 'bogo', 'multi_buy', 'percentage_off'].includes(d.deal_type)) return false;
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
// System instruction — anker voor alle grounded zoek-calls
// ---------------------------------------------------------------------------

// Eén gedeelde system instruction voor élke grounded call. Verankert het gedrag
// op API-niveau i.p.v. het in elke prompt te herhalen: alleen échte, actuele
// aanbiedingen uit de zoekresultaten, geen verzinsels, en strikt de gevraagde
// JSON. NB: dit is GEEN HTML→JSON-conversie (de app stuurt geen HTML; Gemini
// zoekt zelf via Google Search) — de instructie is daarop afgestemd.
const SCRAPER_SYSTEM_INSTRUCTION = `Je bent een nauwkeurige data-extractor voor Nederlandse supermarkt-weekaanbiedingen. Je gebruikt UITSLUITEND de actuele Google Search-resultaten als bron.

Harde regels:
- Verzin NOOIT producten, prijzen of kortingen. Geef alleen aanbiedingen terug die daadwerkelijk in de zoekresultaten staan en deze week geldig zijn.
- Neem prijzen exact over zoals vermeld. De stukprijs (deal_price) mag je afleiden uit de bundelprijs en het aantal, maar verzin nooit een ontbrekend bedrag.
- Is de reguliere prijs (original_price) niet te vinden? Geef dan null — schat of gok nooit.
- Negeer navigatie, advertenties, tracking, cookiemeldingen en producten zonder echte korting. Focus uitsluitend op concrete productaanbiedingen.
- Behoud de exacte productnaam inclusief merk en gewicht/volume.
- Antwoord ALLEEN met de gevraagde JSON-array. Geen uitleg, geen markdown.`;

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
// Fase 1 — Brede zoekstrategieën (7 strategieën)
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
  {
    name: 'Avondeten & Diner aanbiedingen',
    buildPrompt: (store, urlHint, exclude) => `
Zoek ALLE aanbiedingen bij ${store} in Nederland die relevant zijn voor het bereiden van avondeten / diner.

${urlHint}${exclusionNote(exclude)}

Denk aan: vlees, vis, gevogelte, groenten, aardappelen, pasta, rijst, sauzen, peulvruchten, zuivel voor in maaltijden, kaas, soepen, maaltijdkruiden. Alles wat je nodig hebt om een diner te koken.

Verzamel minimaal 25 producten.

${jsonSchema(store)}`.trim(),
  },
  {
    name: 'Maaltijdcomponenten',
    buildPrompt: (store, urlHint, exclude) => `
Zoek aanbiedingen bij ${store} in Nederland voor maaltijdcomponenten: proteïnen, groenten, koolhydraten en sauzen.

${urlHint}${exclusionNote(exclude)}

Proteïnen: kip, rund, varken, vis, garnalen, tofu, eieren, peulvruchten.
Groenten: alle verse en diepvries groenten, ook aardappelen en wortels.
Koolhydraten: pasta, rijst, couscous, quinoa, aardappelen.
Sauzen & Kruiden: pastasaus, marinade, kruidenmix, bouillon, olijfolie.

${jsonSchema(store)}`.trim(),
  },
];

// ---------------------------------------------------------------------------
// Fase 2 — Categoriespecifieke zoekstrategieën (18 strategieën)
// ---------------------------------------------------------------------------

const CATEGORY_STRATEGIES: SearchStrategy[] = [
  {
    name: 'Groente',
    buildPrompt: (store, urlHint, exclude) => `
Zoek uitsluitend verse groenten die deze week in de aanbieding zijn bij ${store} in Nederland.

${urlHint}${exclusionNote(exclude)}

Denk aan: paprika, tomaat, komkommer, sla, wortel, broccoli, spinazie, courgette, prei, ui, bloemkool, spruitjes, champignons, venkel, mais, paksoi.

${jsonSchema(store)}`.trim(),
  },
  {
    name: 'Fruit',
    buildPrompt: (store, urlHint, exclude) => `
Zoek uitsluitend verse fruitsoorten die deze week in de aanbieding zijn bij ${store} in Nederland.

${urlHint}${exclusionNote(exclude)}

Denk aan: appels, peren, bananen, sinaasappels, mandarijnen, druiven, aardbeien, bosbes, mango, ananas, watermeloen, kiwi.

${jsonSchema(store)}`.trim(),
  },
  {
    name: 'Aardappelen',
    buildPrompt: (store, urlHint, exclude) => `
Zoek uitsluitend aardappelproducten die deze week in de aanbieding zijn bij ${store} in Nederland.

${urlHint}${exclusionNote(exclude)}

Denk aan: aardappelen (vers, vastkokend, bloemig), krieltjes, zoete aardappel, bataat, aardappelpuree, roosteraardappels, friet/frites.

${jsonSchema(store)}`.trim(),
  },
  {
    name: 'Kip & Gevogelte',
    buildPrompt: (store, urlHint, exclude) => `
Zoek uitsluitend kip- en gevojeltproducten die deze week in de aanbieding zijn bij ${store} in Nederland.

${urlHint}${exclusionNote(exclude)}

Denk aan: kipfilet, kippendijen, kipdijfilet, drumsticks, kippenvleugels, hele kip, kipgehakt, kipschnitzels, kalkoenfilet, eendenborst.

${jsonSchema(store)}`.trim(),
  },
  {
    name: 'Rund & Varkensvlees',
    buildPrompt: (store, urlHint, exclude) => `
Zoek uitsluitend rund- en varkensproducten die deze week in de aanbieding zijn bij ${store} in Nederland.

${urlHint}${exclusionNote(exclude)}

Denk aan: gehakt, biefstuk, entrecôte, varkenshaas, karbonade, sukadelap, rosbief, burgers, schnitzels, ribstuk, slavink.

${jsonSchema(store)}`.trim(),
  },
  {
    name: 'Vis',
    buildPrompt: (store, urlHint, exclude) => `
Zoek uitsluitend visproducten die deze week in de aanbieding zijn bij ${store} in Nederland.

${urlHint}${exclusionNote(exclude)}

Denk aan: zalm, kabeljauw, tilapia, tonijn, haring, makreel, forel, pangasius, zeebaars, dorade, gerookte zalm, vissticks, sardines.

${jsonSchema(store)}`.trim(),
  },
  {
    name: 'Zeevruchten',
    buildPrompt: (store, urlHint, exclude) => `
Zoek uitsluitend zeevruchten en schaal- en schelpdieren die deze week in de aanbieding zijn bij ${store} in Nederland.

${urlHint}${exclusionNote(exclude)}

Denk aan: garnalen, mosselen, inktvis, calamari, kreeft, krab, oesters, sint-jakobsschelpen, langoustines.

${jsonSchema(store)}`.trim(),
  },
  {
    name: 'Vegetarisch & Vegan',
    buildPrompt: (store, urlHint, exclude) => `
Zoek uitsluitend vegetarische en vegan producten die deze week in de aanbieding zijn bij ${store} in Nederland.

${urlHint}${exclusionNote(exclude)}

Denk aan: tofu, tempeh, Quorn, vleesvervangers, plantaardige melk, vegan kaas, hummus, falafel, seitan, vegaburgers, plantaardig gehakt.

${jsonSchema(store)}`.trim(),
  },
  {
    name: 'Peulvruchten',
    buildPrompt: (store, urlHint, exclude) => `
Zoek uitsluitend peulvruchten die deze week in de aanbieding zijn bij ${store} in Nederland.

${urlHint}${exclusionNote(exclude)}

Denk aan: linzen (rood, groen, zwart), kikkererwten (vers of uit blik), kidneybonen, bruine bonen, witte bonen, zwarte bonen, doperwten, edamame, sperziebonen.

${jsonSchema(store)}`.trim(),
  },
  {
    name: 'Zuivel & Eieren',
    buildPrompt: (store, urlHint, exclude) => `
Zoek uitsluitend zuivelproducten en eieren die deze week in de aanbieding zijn bij ${store} in Nederland.

${urlHint}${exclusionNote(exclude)}

Denk aan: melk (halfvol, vol, mager), yoghurt, kwark, vla, slagroom, crème fraîche, boter, eieren, karnemelk, havermelk.

${jsonSchema(store)}`.trim(),
  },
  {
    name: 'Kaas',
    buildPrompt: (store, urlHint, exclude) => `
Zoek uitsluitend kaasproducten die deze week in de aanbieding zijn bij ${store} in Nederland.

${urlHint}${exclusionNote(exclude)}

Denk aan: Gouda, Edam, Brie, Camembert, Feta, Mozzarella, smeerkaas, roomkaas, Parmezaan, Grana Padano, Halloumi, Manchego.

${jsonSchema(store)}`.trim(),
  },
  {
    name: 'Diepvries',
    buildPrompt: (store, urlHint, exclude) => `
Zoek uitsluitend diepvriesproducten die deze week in de aanbieding zijn bij ${store} in Nederland.

${urlHint}${exclusionNote(exclude)}

Denk aan: diepvriesgroenten, diepvries maaltijden, diepvriespizza, diepvries vis, friet/frites, ijs. Vermeld altijd dat het diepvries betreft.

${jsonSchema(store)}`.trim(),
  },
  {
    name: 'Pasta, Rijst & Granen',
    buildPrompt: (store, urlHint, exclude) => `
Zoek uitsluitend pasta, rijst en graanproducten die deze week in de aanbieding zijn bij ${store} in Nederland.

${urlHint}${exclusionNote(exclude)}

Denk aan: spaghetti, penne, fusilli, lasagne, rijst, zilvervliesrijst, basmati, couscous, quinoa, bulgur, mie, noodles.

${jsonSchema(store)}`.trim(),
  },
  {
    name: 'Sauzen & Conserven',
    buildPrompt: (store, urlHint, exclude) => `
Zoek uitsluitend sauzen, conserven en maaltijdingrediënten die deze week in de aanbieding zijn bij ${store} in Nederland.

${urlHint}${exclusionNote(exclude)}

Denk aan: pastasaus, tomatenpuree, tomatenblokjes, ketchup, mayonaise, pesto, olijfolie, marinade, kruidenmix, chilisaus, teriyaki, azijn, sambal, ketjap.

${jsonSchema(store)}`.trim(),
  },
  {
    name: 'Soepen & Bouillon',
    buildPrompt: (store, urlHint, exclude) => `
Zoek uitsluitend soepen, bouillon en fond die deze week in de aanbieding zijn bij ${store} in Nederland.

${urlHint}${exclusionNote(exclude)}

Denk aan: tomatensoep, groentesoep, kippensoep, bouillonblokjes, fond, miso, ramen, vleesbouillon, kruidenbouillon.

${jsonSchema(store)}`.trim(),
  },
  {
    name: 'Wok & Wereldkeuken',
    buildPrompt: (store, urlHint, exclude) => `
Zoek uitsluitend wok- en wereldkeuken-producten die deze week in de aanbieding zijn bij ${store} in Nederland.

${urlHint}${exclusionNote(exclude)}

Denk aan: nasi, bami, curry, wok-groenten, kokosmelk, tacos, tortilla's, wraps, pita, naan, shoarma, sushi, Thais/Indiaas/Mexicaans/Aziatisch.

${jsonSchema(store)}`.trim(),
  },
  {
    name: 'Vleeswaren & Deli',
    buildPrompt: (store, urlHint, exclude) => `
Zoek uitsluitend vleeswaren en deli-producten die deze week in de aanbieding zijn bij ${store} in Nederland.

${urlHint}${exclusionNote(exclude)}

Denk aan: ham, salami, chorizo, rookvlees, spek, bacon, paté, prosciutto, cervelaat, mortadella, smeerworst.

${jsonSchema(store)}`.trim(),
  },
  {
    name: 'Kant-en-klaar',
    buildPrompt: (store, urlHint, exclude) => `
Zoek uitsluitend kant-en-klaar maaltijden die deze week in de aanbieding zijn bij ${store} in Nederland.

${urlHint}${exclusionNote(exclude)}

Denk aan: verse kant-en-klaar maaltijden, ovenschotels, stampot, maaltijdschotels, diepvries maaltijden voor diner, sushi-pakken, maaltijdsalades.

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
    const raw = await generateGroundedJson<Deal[]>({
      prompt,
      model: GEMINI_CHEF,
      systemInstruction: SCRAPER_SYSTEM_INSTRUCTION,
    });
    const batch = Array.isArray(raw) ? raw : [];
    return batch.map((d) => ({ ...d, supermarket: d.supermarket || store }));
  } catch (err) {
    // Log én gooi door — NOOIT inslikken. Een ingeslikte fout (ontbrekende key,
    // onbekend model, 403/quota) zag er voorheen identiek uit als "0 producten
    // gevonden". Promise.allSettled in runForager vangt de rejection op zodat één
    // gefaalde strategie de rest niet meesleurt, maar zo kunnen we wél tellen
    // hoeveel calls écht faalden en een totale mislukking als 'failed' melden.
    console.error(`[Forager] Strategie "${strategy.name}" voor ${store} faalde:`, err);
    throw err;
  }
}

/**
 * Verwerkt een Promise.allSettled-resultaat van strategie-calls: bundelt de
 * deals van geslaagde calls en houdt bij hoeveel er slaagden/faalden plus de
 * eerste foutmelding. Zo kan runForager een totale mislukking (alle calls falen)
 * onderscheiden van een oprecht lege uitkomst (calls slaagden, 0 producten).
 */
function collectSettled(results: PromiseSettledResult<Deal[]>[]): {
  deals: Deal[];
  succeeded: number;
  failed: number;
  firstError: unknown;
} {
  const deals: Deal[] = [];
  let succeeded = 0;
  let failed = 0;
  let firstError: unknown;
  for (const r of results) {
    if (r.status === 'fulfilled') {
      succeeded++;
      deals.push(...r.value);
    } else {
      failed++;
      if (firstError === undefined) firstError = r.reason;
    }
  }
  return { deals, succeeded, failed, firstError };
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'onbekende fout';
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

${urlHint}${exclusionNote(exclude, 40)}

${keywords ? `Zoek specifiek naar: ${keywords}.` : ''}

${jsonSchema(store)}`.trim(),
  };
}

// ---------------------------------------------------------------------------
// Fase 6 — Gap-analyse
// ---------------------------------------------------------------------------

async function runGapAnalysis(store: string, urlHint: string, currentDeals: Deal[]): Promise<Deal[]> {
  const foundList = currentDeals
    .map((d) => d.product_name)
    .slice(0, 100)
    .join('\n');

  const prompt = `
We hebben de volgende aanbiedingen gevonden bij ${store} voor deze week:

${foundList}

${urlHint}

Zoek nu uitsluitend avondeten-relevante aanbiedingen bij ${store} die HIERBOVEN NIET voorkomen.
Denk aan:
- Vlees, vis, gevogelte of zeevruchten die we nog missen
- Groenten of aardappelen die we nog missen
- Pasta, rijst, granen of peulvruchten die we nog missen
- Sauzen, marinades, bouillon of kruidenmixen die we nog missen
- Zuivel, kaas of eieren voor avondmaaltijden die we nog missen
- Kant-en-klare avondmaaltijden of diepvries maaltijden die we nog missen

Lever ALLEEN producten op die écht in de aanbieding zijn én nog niet in de lijst hierboven staan.

${jsonSchema(store)}`.trim();

  try {
    const raw = await generateGroundedJson<Deal[]>({
      prompt,
      model: GEMINI_CHEF,
      systemInstruction: SCRAPER_SYSTEM_INSTRUCTION,
    });
    const batch = Array.isArray(raw) ? raw : [];
    return batch.map((d) => ({ ...d, supermarket: d.supermarket || store }));
  } catch (err) {
    console.error(`[Forager] Gap-analyse voor ${store} faalde:`, err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Exporteerbaar resultaattype inclusief metrics
// ---------------------------------------------------------------------------

export interface ForagerResult {
  deals: Deal[];
  coverage: CoverageReport;
  aiCallsMade: number;
  aiCallsFailed: number;
  durationMs: number;
  duplicatesRemoved: number;
}

/**
 * Gegooid wanneer ELKE zoek-call van fase 1 + 2 faalt. Dat betekent dat de AI
 * onbereikbaar/verkeerd geconfigureerd is (ontbrekende key, onbekend model,
 * quota) — geen "0 aanbiedingen deze week". scrapeStore vangt dit en markeert de
 * run als 'failed' met een zichtbare foutmelding i.p.v. een vals "Klaar!".
 */
export class ForagerTotalFailureError extends Error {
  constructor(store: string, cause: unknown) {
    super(`Aanbiedingen ophalen voor ${store} mislukte volledig: ${errorMessage(cause)}`);
    this.name = 'ForagerTotalFailureError';
  }
}

// ---------------------------------------------------------------------------
// Interne implementatie
// ---------------------------------------------------------------------------

async function runForager(store: string, onProgress?: (count: number) => void): Promise<ForagerResult> {
  const startMs = Date.now();
  const urlHint = buildUrlHint(store);
  let aiCallsMade = 0;
  let aiCallsFailed = 0;
  let totalRaw = 0;

  console.log(`[Forager] ▶ Start voor ${store}`);

  // ── Fase 1: Brede zoekstrategieën (parallel) ──────────────────────────────
  console.log(`[Forager] Fase 1: ${BROAD_STRATEGIES.length} brede strategieën parallel voor ${store}`);
  aiCallsMade += BROAD_STRATEGIES.length;

  const broad = collectSettled(
    await Promise.allSettled(BROAD_STRATEGIES.map((s) => runStrategy(s, store, urlHint, [])))
  );
  aiCallsFailed += broad.failed;
  const rawDeals = broad.deals;
  totalRaw += rawDeals.length;
  let allDeals = deduplicateDeals(qualityFilter(rawDeals));
  console.log(`[Forager] Na fase 1: ${allDeals.length} unieke producten (${rawDeals.length} ruw, ${broad.failed}/${BROAD_STRATEGIES.length} calls faalden) voor ${store}`);
  onProgress?.(allDeals.length);

  // ── Fase 2: Categoriespecifieke zoekstrategieën (parallel) ────────────────
  // Geen exclusielijst — deduplicatie pakt overlappen af. Exclusies verwarren
  // Gemini en zorgen ervoor dat het gerelateerde producten overslaat.
  console.log(`[Forager] Fase 2: ${CATEGORY_STRATEGIES.length} categoriestrategieën parallel voor ${store}`);
  aiCallsMade += CATEGORY_STRATEGIES.length;

  const category = collectSettled(
    await Promise.allSettled(CATEGORY_STRATEGIES.map((s) => runStrategy(s, store, urlHint, [])))
  );
  aiCallsFailed += category.failed;
  const categoryRaw = category.deals;
  totalRaw += categoryRaw.length;
  allDeals = deduplicateDeals([...allDeals, ...qualityFilter(categoryRaw)]);
  console.log(`[Forager] Na fase 2: ${allDeals.length} unieke producten (${categoryRaw.length} ruw, ${category.failed}/${CATEGORY_STRATEGIES.length} calls faalden) voor ${store}`);
  onProgress?.(allDeals.length);

  // ── Totale-mislukking-bewaking ────────────────────────────────────────────
  // Als ELKE call van fase 1 + 2 faalde, is de AI onbereikbaar/verkeerd
  // geconfigureerd (geen lege week). Gooi door zodat scrapeStore de run als
  // 'failed' markeert en de gebruiker de échte reden ziet i.p.v. "Klaar!".
  if (broad.succeeded === 0 && category.succeeded === 0) {
    throw new ForagerTotalFailureError(store, broad.firstError ?? category.firstError);
  }

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
    const recovery = collectSettled(
      await Promise.allSettled(
        recoveryStrategies.map((s) => runStrategy(s, store, urlHint, currentExclude))
      )
    );
    aiCallsFailed += recovery.failed;
    const recoveryRaw = recovery.deals;
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
    onProgress?.(allDeals.length);
  }

  // ── Fase 5: Gap-analyse — alleen als coverage onder 85% ligt ────────────────
  // Sla over bij goede coverage om edge-functie timeout-vrij te houden.
  if (coverage.confidenceScore < 85) {
    console.log(`[Forager] Fase 5: gap-analyse voor ${store} (coverage ${coverage.confidenceScore}%, ${allDeals.length} producten als context)`);
    aiCallsMade += 1;
    const gapRaw = await runGapAnalysis(store, urlHint, allDeals);
    totalRaw += gapRaw.length;

    if (gapRaw.length > 0) {
      const beforeGap = allDeals.length;
      allDeals = deduplicateDeals([...allDeals, ...qualityFilter(gapRaw)]);
      coverage = analyzeCoverage(allDeals);
      console.log(
        `[Forager] Na gap-analyse: ${allDeals.length} producten (+${allDeals.length - beforeGap} nieuw), coverage ${coverage.confidenceScore}%`
      );
      onProgress?.(allDeals.length);
    } else {
      console.log(`[Forager] Gap-analyse: geen extra producten gevonden.`);
    }
  }

  const durationMs = Date.now() - startMs;
  const duplicatesRemoved = totalRaw - allDeals.length;

  console.log(
    `[Forager] ✓ Klaar voor ${store}: ${allDeals.length} producten, ` +
    `confidence ${coverage.confidenceScore}%, ` +
    `${coverage.categoriesFound.length}/${PRODUCT_CATEGORIES.length} categorieën, ` +
    `${duplicatesRemoved} duplicaten verwijderd, ` +
    `${aiCallsMade} AI-calls (${aiCallsFailed} faalden), ${Math.round(durationMs / 1000)}s`
  );

  return { deals: allDeals, coverage, aiCallsMade, aiCallsFailed, durationMs, duplicatesRemoved };
}

// ---------------------------------------------------------------------------
// Exportfuncties
// ---------------------------------------------------------------------------

/** Volledige forager-run met metrics. Gebruik dit in scrapeStore voor opslag. */
export async function forageDealsWithMetrics(store: string, onProgress?: (count: number) => void): Promise<ForagerResult> {
  return runForager(store, onProgress);
}

/** Backward-compatibele wrapper die alleen de deals teruggeeft. */
export async function forageDeals(store: string): Promise<Deal[]> {
  const result = await runForager(store);
  return result.deals;
}
