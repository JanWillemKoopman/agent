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

// Exact-match deduplicatie per winkel (gekopieerd uit forager.ts).
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
// deduplicateDeals
// ---------------------------------------------------------------------------

describe('deduplicateDeals', () => {
  it('verwijdert exacte duplicaten (zelfde naam + zelfde winkel)', () => {
    const deals = [makeDeal(), makeDeal()];
    expect(deduplicateDeals(deals)).toHaveLength(1);
  });

  it('behoudt producten met dezelfde naam bij verschillende winkels', () => {
    const deals = [
      makeDeal({ product_name: 'Kipfilet 600g', supermarket: 'Albert Heijn' }),
      makeDeal({ product_name: 'Kipfilet 600g', supermarket: 'Jumbo' }),
    ];
    expect(deduplicateDeals(deals)).toHaveLength(2);
  });

  it('behoudt varianten met verschillende gewichten als aparte producten', () => {
    const deals = [
      makeDeal({ product_name: 'AH Kipfilet 600g' }),
      makeDeal({ product_name: 'AH Kipfilet 500g' }),
    ];
    expect(deduplicateDeals(deals)).toHaveLength(2);
  });

  it('beschouwt hoofdletterverschillen als hetzelfde product', () => {
    const deals = [
      makeDeal({ product_name: 'AH Kipfilet 600g' }),
      makeDeal({ product_name: 'ah kipfilet 600g' }),
    ];
    expect(deduplicateDeals(deals)).toHaveLength(1);
  });

  it('beschouwt puntjes en koppeltekens als witruimte (normalisatie)', () => {
    const deals = [
      makeDeal({ product_name: 'Jumbo Halfvolle melk 1L' }),
      makeDeal({ product_name: 'Jumbo Halfvolle Melk. 1L' }),
    ];
    expect(deduplicateDeals(deals)).toHaveLength(1);
  });

  it('behoudt unieke producten bij dezelfde winkel', () => {
    const deals = [
      makeDeal({ product_name: 'AH Kipfilet 600g' }),
      makeDeal({ product_name: 'AH Rundergehakt 500g' }),
      makeDeal({ product_name: 'AH Verse Zalm 2 stuks' }),
    ];
    expect(deduplicateDeals(deals)).toHaveLength(3);
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
});

// ---------------------------------------------------------------------------
// qualityFilter
// ---------------------------------------------------------------------------

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
