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

export interface StockItem {
  id: string;
  productId: string;
  locationId: string;
  batchId: string | null;
  quantity: number;
}
