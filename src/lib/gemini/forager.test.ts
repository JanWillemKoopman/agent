import { describe, it, expect } from 'vitest';
import type { Deal } from '../types';

// ---------------------------------------------------------------------------
// Helpers gekopieerd uit forager.ts — we testen de pure functies direct.
// Vitest kan de Gemini-client niet aanroepen, dus we importeren alleen de
// deterministische logica. Wijzig de exports in forager.ts niet om tests te
// ondersteunen; zorg liever dat de pure functies zelfstandig testbaar zijn.
// ---------------------------------------------------------------------------

// Gekopieerd uit forager.ts: bundelt allSettled-resultaten en telt slagen/falen.
// Drijft de "alle calls faalden → markeer run als failed"-beslissing.
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

function normalize(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.\-,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function areSimilar(a: string, b: string): boolean {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return true;
  const shorter = na.length < nb.length ? na : nb;
  const longer = na.length < nb.length ? nb : na;
  if (longer.includes(shorter) && shorter.length > 6) return true;
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
    const qty = Number(d.min_quantity);
    if (!Number.isInteger(qty) || qty < 1) return false;
    if ((d.deal_type === 'bogo' || d.deal_type === 'multi_buy') && qty < 2) return false;
    if (d.bundle_price !== null && d.bundle_price !== undefined && d.bundle_price <= 0) return false;
    return true;
  });
}

// ---------------------------------------------------------------------------
// Testdata factory
// ---------------------------------------------------------------------------

function makeDeal(overrides: Partial<Deal> = {}): Deal {
  return {
    product_name: 'AH Kipfilet 600g',
    deal_price: 3.99,
    original_price: 5.99,
    supermarket: 'Albert Heijn',
    deal_type: 'single',
    min_quantity: 1,
    bundle_price: null,
    deal_description: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// areSimilar
// ---------------------------------------------------------------------------

describe('areSimilar', () => {
  it('herkent exacte duplicaten', () => {
    expect(areSimilar('AH Kipfilet 600g', 'AH Kipfilet 600g')).toBe(true);
  });

  it('herkent variant met extra gewicht-info', () => {
    expect(areSimilar('AH Kipfilet', 'AH Kipfilet 600g')).toBe(true);
  });

  it('is hoofdletter-onafhankelijk', () => {
    expect(areSimilar('ah kipfilet 600g', 'AH KIPFILET 600G')).toBe(true);
  });

  it('herkent dezelfde productnaam met punten', () => {
    expect(areSimilar('Jumbo Halfvolle melk 1L', 'Jumbo Halfvolle Melk. 1L')).toBe(true);
  });

  it('beschouwt totaal verschillende producten als niet-gelijk', () => {
    expect(areSimilar('AH Kipfilet 600g', 'Jumbo Zalm 2 stuks')).toBe(false);
  });

  it('beschouwt identieke strings altijd als gelijk, ook korte', () => {
    expect(areSimilar('ah', 'ah')).toBe(true);
  });

  it('herkent producten met dezelfde kern maar minor verschil in merk-afkorting niet als zelfde wanneer Jaccard te laag is', () => {
    // "Lidl zalm filet 300g" vs "Jumbo zalmfilet 400g" — hoge overlap maar andere winkel/gewicht
    // Jaccard: {'zalmfilet'} ∩ {'zalm','filet','300g'} = 0 → false
    expect(areSimilar('Lidl zalm filet 300g', 'Jumbo zalmfilet 400g')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// deduplicateDeals
// ---------------------------------------------------------------------------

describe('deduplicateDeals', () => {
  it('verwijdert exacte duplicaten', () => {
    const deals = [makeDeal(), makeDeal()];
    expect(deduplicateDeals(deals)).toHaveLength(1);
  });

  it('behoudt unieke producten', () => {
    const deals = [
      makeDeal({ product_name: 'AH Kipfilet 600g' }),
      makeDeal({ product_name: 'Jumbo Verse zalm 300g' }),
      makeDeal({ product_name: 'Plus Biologische spinazie 200g' }),
    ];
    expect(deduplicateDeals(deals)).toHaveLength(3);
  });

  it('verwijdert fuzzy duplicaten (variant zonder gewicht)', () => {
    const deals = [
      makeDeal({ product_name: 'AH Kipfilet 600g' }),
      makeDeal({ product_name: 'AH Kipfilet' }),
    ];
    expect(deduplicateDeals(deals)).toHaveLength(1);
  });

  it('behoudt het eerste exemplaar bij duplicaten', () => {
    const deals = [
      makeDeal({ product_name: 'AH Kipfilet 600g', deal_price: 3.99 }),
      makeDeal({ product_name: 'AH Kipfilet 600g', deal_price: 4.99 }),
    ];
    expect(deduplicateDeals(deals)[0].deal_price).toBe(3.99);
  });

  it('verwerkt lege array zonder fout', () => {
    expect(deduplicateDeals([])).toEqual([]);
  });

  it('verwijdert geen producten die echt uniek zijn (verschillende categorieën)', () => {
    // Producten uit totaal verschillende categorieën binnen één winkel.
    // De fuzzy matcher mag ze NIET samenvoegen.
    const uniqueProducts = [
      'AH Kipfilet 600g',
      'AH Rundergehakt 500g',
      'AH Verse Zalm 2 stuks',
      'AH Halfvolle melk 1L',
      'AH Gouda Jong 500g',
      'AH Volkoren brood 800g',
      'AH Diepvries spinazie 450g',
      'AH Spaghetti 500g',
      'AH Pastasaus bolognese 690g',
      'AH Cola 6×1.5L',
      'AH Chips naturel 200g',
      'AH Cornflakes 375g',
    ];
    const deals = uniqueProducts.map((name) => makeDeal({ product_name: name }));
    const result = deduplicateDeals(deals);
    expect(result.length).toBe(uniqueProducts.length);
  });
});

// ---------------------------------------------------------------------------
// qualityFilter
// ---------------------------------------------------------------------------

describe('qualityFilter', () => {
  it('laat geldige deals door', () => {
    expect(qualityFilter([makeDeal()])).toHaveLength(1);
  });

  it('filtert deals met lege product_name', () => {
    expect(qualityFilter([makeDeal({ product_name: '' })])).toHaveLength(0);
  });

  it('filtert deals met te korte product_name (< 3 tekens)', () => {
    expect(qualityFilter([makeDeal({ product_name: 'AB' })])).toHaveLength(0);
  });

  it('filtert deals met negatieve prijs', () => {
    expect(qualityFilter([makeDeal({ deal_price: -1 })])).toHaveLength(0);
  });

  it('filtert deals met ongeldige deal_type', () => {
    expect(
      qualityFilter([makeDeal({ deal_type: 'unknown' as Deal['deal_type'] })])
    ).toHaveLength(0);
  });

  it('accepteert alle geldige deal_types met correcte min_quantity', () => {
    const deals: Deal[] = [
      makeDeal({ deal_type: 'single', min_quantity: 1 }),
      makeDeal({ deal_type: 'bogo', min_quantity: 2, bundle_price: 3.99 }),
      makeDeal({ deal_type: 'multi_buy', min_quantity: 2, bundle_price: 5.0 }),
      makeDeal({ deal_type: 'percentage_off', min_quantity: 1 }),
    ];
    expect(qualityFilter(deals)).toHaveLength(4);
  });

  it('filtert deals met price = 0 niet (0 is geldig bij gratis product)', () => {
    expect(qualityFilter([makeDeal({ deal_price: 0 })])).toHaveLength(1);
  });

  it('verwerkt lege array zonder fout', () => {
    expect(qualityFilter([])).toEqual([]);
  });

  it('verwerkt array met gemengde geldige en ongeldige deals', () => {
    const deals = [
      makeDeal(),
      makeDeal({ product_name: '' }),
      makeDeal({ deal_price: -5 }),
      makeDeal({ product_name: 'Jumbo Melk 1L' }),
    ];
    expect(qualityFilter(deals)).toHaveLength(2);
  });

  it('filtert deals met min_quantity = 0', () => {
    expect(qualityFilter([makeDeal({ min_quantity: 0 })])).toHaveLength(0);
  });

  it('filtert deals met negatieve min_quantity', () => {
    expect(qualityFilter([makeDeal({ min_quantity: -1 })])).toHaveLength(0);
  });

  it('filtert bogo deals waarbij min_quantity = 1 (inconsistent)', () => {
    expect(
      qualityFilter([makeDeal({ deal_type: 'bogo', min_quantity: 1 })])
    ).toHaveLength(0);
  });

  it('filtert multi_buy deals waarbij min_quantity = 1 (inconsistent)', () => {
    expect(
      qualityFilter([makeDeal({ deal_type: 'multi_buy', min_quantity: 1, bundle_price: 5.0 })])
    ).toHaveLength(0);
  });

  it('accepteert bogo deal met min_quantity = 2', () => {
    expect(
      qualityFilter([makeDeal({ deal_type: 'bogo', min_quantity: 2, bundle_price: 3.99 })])
    ).toHaveLength(1);
  });

  it('filtert deals met bundle_price = 0 (negatief/nul bundle onmogelijk)', () => {
    expect(
      qualityFilter([makeDeal({ deal_type: 'multi_buy', min_quantity: 2, bundle_price: 0 })])
    ).toHaveLength(0);
  });

  it('accepteert deals met bundle_price = null (bij single)', () => {
    expect(
      qualityFilter([makeDeal({ deal_type: 'single', min_quantity: 1, bundle_price: null })])
    ).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// collectSettled — telt geslaagde vs. gefaalde strategie-calls. Dit is de basis
// voor de "alle calls faalden → run als failed melden" beslissing in runForager.
// ---------------------------------------------------------------------------

describe('collectSettled', () => {
  const ok = (deals: Deal[]): PromiseSettledResult<Deal[]> => ({
    status: 'fulfilled',
    value: deals,
  });
  const fail = (reason: unknown): PromiseSettledResult<Deal[]> => ({
    status: 'rejected',
    reason,
  });

  it('telt geslaagde calls en bundelt hun deals', () => {
    const res = collectSettled([ok([makeDeal()]), ok([makeDeal(), makeDeal()])]);
    expect(res.succeeded).toBe(2);
    expect(res.failed).toBe(0);
    expect(res.deals).toHaveLength(3);
  });

  it('telt gefaalde calls en bewaart de eerste fout', () => {
    const res = collectSettled([
      fail(new Error('GEMINI_API_KEY ontbreekt')),
      fail(new Error('tweede fout')),
    ]);
    expect(res.succeeded).toBe(0);
    expect(res.failed).toBe(2);
    expect(res.deals).toHaveLength(0);
    expect((res.firstError as Error).message).toBe('GEMINI_API_KEY ontbreekt');
  });

  it('onderscheidt een geslaagde-maar-lege uitkomst van een totale mislukking', () => {
    // Calls slaagden maar gaven 0 deals → succeeded > 0 (geen mislukking).
    const emptySuccess = collectSettled([ok([]), ok([])]);
    expect(emptySuccess.succeeded).toBe(2);
    expect(emptySuccess.failed).toBe(0);

    // Alle calls faalden → succeeded === 0 → runForager moet gooien (failed).
    const totalFailure = collectSettled([fail(new Error('404')), fail(new Error('404'))]);
    expect(totalFailure.succeeded).toBe(0);
  });

  it('verwerkt een gemengde uitkomst correct', () => {
    const res = collectSettled([ok([makeDeal()]), fail(new Error('x')), ok([])]);
    expect(res.succeeded).toBe(2);
    expect(res.failed).toBe(1);
    expect(res.deals).toHaveLength(1);
  });
});
