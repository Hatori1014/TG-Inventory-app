// HU-10 — enriched over HU-07's "básico" version (ADR-27): nested
// product/location names instead of flat ids, so the frontend stock
// screen doesn't need a second round-trip per row.
export interface StockResponseDto {
  id: string;
  product: { id: string; name: string };
  location: { id: string; name: string };
  batchId: string | null;
  quantity: number;
}
