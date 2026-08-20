// Mirrors the backend DTOs (plan section 7.4, HU-07/HU-08, ADR-27/ADR-28).
export type MovementType = 'in' | 'out' | 'adjustment' | 'transfer';
export type AdjustmentDirection = 'increase' | 'decrease';

export interface CreateMovementRequest {
  productId: string;
  locationId: string;
  batchId?: string;
  type: MovementType;
  quantity: number;
  notes?: string;
  // Only for type === 'adjustment'.
  direction?: AdjustmentDirection;
  // Only for type === 'transfer' (destination location; locationId is the source).
  destinationLocationId?: string;
}

export interface Movement {
  id: string;
  productId: string;
  locationId: string;
  batchId: string | null;
  type: string;
  quantity: number;
  userId: string;
  occurredAt: string;
  notes: string | null;
}

export interface TransferResult {
  out: Movement;
  in: Movement;
}

// HU-10 — enriched over HU-07's "básico" version (ADR-27): nested
// product/location names instead of flat ids.
export interface StockItem {
  id: string;
  product: { id: string; name: string };
  location: { id: string; name: string };
  batchId: string | null;
  quantity: number;
}

// HU-11 — one minimum per product, not per product+location (DoR resolved
// by the user, diverges from the original MER): the alert (HU-12) sums
// stock across every location/batch of that product against this single
// threshold.
export interface MinimumStock {
  id: string;
  productId: string;
  productName: string;
  minimumQuantity: number;
}

// HU-12 — GET /alerts, not paginated (see ListAlertsUseCase on the
// backend for the scale-based reasoning). deficit is totalQuantity -
// minimumQuantity, always <= 0 for anything returned here.
export interface StockAlert {
  productId: string;
  productName: string;
  minimumQuantity: number;
  totalQuantity: number;
  deficit: number;
}
