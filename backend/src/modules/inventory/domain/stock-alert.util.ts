// HU-12 — "Panel de productos en alerta" (plan section 7.4). Pure
// calculation, no NestJS/Prisma dependency (ADR-17: domain computes,
// application/infrastructure orchestrate) — the repository already did the
// join/sum work; this only decides what counts as "in alert" and in what
// order to show it.

export interface ProductStockSummary {
  productId: string;
  productName: string;
  minimumQuantity: number;
  totalQuantity: number;
}

export interface StockAlert extends ProductStockSummary {
  deficit: number;
}

// DoR resolved by the user: the minimum is per product, not per
// product+location — this compares the SUM of stock across every location
// (and batch) of that product against its single minimum, not any one
// location's quantity. "menor o igual" (<=), explicitly stated by the
// user — reaching the minimum exactly still alerts, not just falling below
// it. A product with no LocationStock rows anywhere contributes 0, which
// alerts against any positive minimum (the repository is responsible for
// that 0-default, not this function — see findAllWithStockSums()).
export function buildStockAlerts(summaries: ProductStockSummary[]): StockAlert[] {
  return summaries
    .filter((s) => s.totalQuantity <= s.minimumQuantity)
    .map((s) => ({ ...s, deficit: s.totalQuantity - s.minimumQuantity }))
    .sort((a, b) => a.deficit - b.deficit);
}
