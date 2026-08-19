// HU-14 — "Comparativa de precios de compra" (plan section 7.4). Pure
// calculation functions, no NestJS/Prisma dependency (ADR-17: domain
// computes, application/infrastructure orchestrate), so the aggregation
// math itself is unit-testable in isolation via TDD.

export interface ProductPriceHistoryEntry {
  supplierId: string;
  supplierName: string;
  unitPrice: number;
  purchasedAt: Date;
}

export interface ProductPriceComparisonRow {
  supplierId: string;
  supplierName: string;
  latestUnitPrice: number;
  latestPurchasedAt: string;
}

// View 1, DoR resolved by the user: selecting a product shows one row per
// supplier who has ever sold it, with their most recent price — not an
// average, since "decidir con quién comprar" (the original HU-14 wording)
// is about the price you'd pay today, not a historical blend. Sorted
// cheapest first so the comparison reads directly as a ranking.
export function buildProductPriceComparison(entries: ProductPriceHistoryEntry[]): ProductPriceComparisonRow[] {
  const latestBySupplier = new Map<string, ProductPriceHistoryEntry>();
  for (const entry of entries) {
    const current = latestBySupplier.get(entry.supplierId);
    if (!current || entry.purchasedAt > current.purchasedAt) {
      latestBySupplier.set(entry.supplierId, entry);
    }
  }
  return [...latestBySupplier.values()]
    .sort((a, b) => a.unitPrice - b.unitPrice)
    .map((entry) => ({
      supplierId: entry.supplierId,
      supplierName: entry.supplierName,
      latestUnitPrice: entry.unitPrice,
      latestPurchasedAt: entry.purchasedAt.toISOString(),
    }));
}

export interface SupplierPriceEntry {
  supplierId: string;
  unitPrice: number;
  purchasedAt: Date;
}

export interface MonthlyAverageRow {
  month: string;
  averageBySupplier: Record<string, number | null>;
}

// View 2, DoR resolved by the user: NOT scoped to one product — the
// average blends every unit price each of the up-to-3 selected suppliers
// has ever charged, per month, to show which supplier trends cheaper
// overall. A supplier with no purchases in a given month gets `null`
// rather than being omitted, so every row has an entry for every
// requested supplier (the frontend table/chart doesn't have to guess).
export function buildMonthlyAveragePriceComparison(
  entries: SupplierPriceEntry[],
  supplierIds: string[],
): MonthlyAverageRow[] {
  const sums = new Map<string, { total: number; count: number }>();
  for (const entry of entries) {
    const key = `${toMonthKey(entry.purchasedAt)}|${entry.supplierId}`;
    const acc = sums.get(key) ?? { total: 0, count: 0 };
    acc.total += entry.unitPrice;
    acc.count += 1;
    sums.set(key, acc);
  }

  const months = [...new Set(entries.map((entry) => toMonthKey(entry.purchasedAt)))].sort();

  return months.map((month) => {
    const averageBySupplier: Record<string, number | null> = {};
    for (const supplierId of supplierIds) {
      const acc = sums.get(`${month}|${supplierId}`);
      averageBySupplier[supplierId] = acc ? round2(acc.total / acc.count) : null;
    }
    return { month, averageBySupplier };
  });
}

function toMonthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
