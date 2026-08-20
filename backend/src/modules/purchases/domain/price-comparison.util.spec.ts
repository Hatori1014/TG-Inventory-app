import { buildMonthlyAveragePriceComparison, buildProductPriceComparison } from './price-comparison.util';

describe('buildProductPriceComparison', () => {
  it('returns one row per supplier, keeping only the most recent price', () => {
    const rows = buildProductPriceComparison([
      { supplierId: 's1', supplierName: 'Acme', unitPrice: 10, purchasedAt: new Date('2026-06-01') },
      { supplierId: 's1', supplierName: 'Acme', unitPrice: 12, purchasedAt: new Date('2026-08-01') },
    ]);

    expect(rows).toEqual([
      { supplierId: 's1', supplierName: 'Acme', latestUnitPrice: 12, latestPurchasedAt: '2026-08-01T00:00:00.000Z' },
    ]);
  });

  it('sorts suppliers ascending by price, cheapest first', () => {
    const rows = buildProductPriceComparison([
      { supplierId: 's1', supplierName: 'Acme', unitPrice: 15, purchasedAt: new Date('2026-08-01') },
      { supplierId: 's2', supplierName: 'Beta', unitPrice: 9, purchasedAt: new Date('2026-08-01') },
      { supplierId: 's3', supplierName: 'Gamma', unitPrice: 12, purchasedAt: new Date('2026-08-01') },
    ]);

    expect(rows.map((r) => r.supplierId)).toEqual(['s2', 's3', 's1']);
  });

  it('returns an empty array for a product no one has ever sold', () => {
    expect(buildProductPriceComparison([])).toEqual([]);
  });
});

describe('buildMonthlyAveragePriceComparison', () => {
  it('averages unit prices per supplier per month', () => {
    const rows = buildMonthlyAveragePriceComparison(
      [
        { supplierId: 's1', unitPrice: 10, purchasedAt: new Date('2026-06-05') },
        { supplierId: 's1', unitPrice: 20, purchasedAt: new Date('2026-06-20') },
        { supplierId: 's2', unitPrice: 5, purchasedAt: new Date('2026-06-10') },
      ],
      ['s1', 's2'],
    );

    expect(rows).toEqual([{ month: '2026-06', averageBySupplier: { s1: 15, s2: 5 } }]);
  });

  it('fills a null when a supplier had no purchases in a month another supplier did', () => {
    const rows = buildMonthlyAveragePriceComparison(
      [
        { supplierId: 's1', unitPrice: 10, purchasedAt: new Date('2026-06-05') },
        { supplierId: 's2', unitPrice: 8, purchasedAt: new Date('2026-07-05') },
      ],
      ['s1', 's2'],
    );

    expect(rows).toEqual([
      { month: '2026-06', averageBySupplier: { s1: 10, s2: null } },
      { month: '2026-07', averageBySupplier: { s1: null, s2: 8 } },
    ]);
  });

  it('sorts months chronologically ascending', () => {
    const rows = buildMonthlyAveragePriceComparison(
      [
        { supplierId: 's1', unitPrice: 10, purchasedAt: new Date('2026-08-05') },
        { supplierId: 's1', unitPrice: 20, purchasedAt: new Date('2026-06-05') },
        { supplierId: 's1', unitPrice: 15, purchasedAt: new Date('2026-07-05') },
      ],
      ['s1'],
    );

    expect(rows.map((r) => r.month)).toEqual(['2026-06', '2026-07', '2026-08']);
  });

  it('rounds averages to 2 decimal places', () => {
    const rows = buildMonthlyAveragePriceComparison(
      [
        { supplierId: 's1', unitPrice: 10, purchasedAt: new Date('2026-06-05') },
        { supplierId: 's1', unitPrice: 11, purchasedAt: new Date('2026-06-10') },
        { supplierId: 's1', unitPrice: 10, purchasedAt: new Date('2026-06-15') },
      ],
      ['s1'],
    );

    expect(rows[0].averageBySupplier['s1']).toBe(10.33);
  });

  it('returns an empty array when there is no purchase history at all', () => {
    expect(buildMonthlyAveragePriceComparison([], ['s1', 's2'])).toEqual([]);
  });
});
