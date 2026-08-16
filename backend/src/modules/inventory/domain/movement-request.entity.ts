export type MovementType = 'in' | 'out' | 'adjustment';
export type AdjustmentDirection = 'increase' | 'decrease';

// Entity with behavior (ADR-17) — computeStockDelta() is the actual business
// rule of what a movement does to LocationStock.quantity. Covers the three
// single-location movement types; "transfer" (HU-08, ADR-28) is a distinct
// dual-location, dual-movement operation handled directly by
// InventoryPrismaRepository.registerTransfer() — its transfer_out/
// transfer_in deltas are unambiguous (-quantity/+quantity) and never go
// through this entity.
export class MovementRequest {
  constructor(
    private readonly type: MovementType,
    private readonly quantity: number,
    private readonly adjustmentDirection?: AdjustmentDirection,
  ) {
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error('Movement quantity must be a positive number');
    }
    if (type === 'adjustment' && !adjustmentDirection) {
      throw new Error('adjustment movements require a direction ("increase" or "decrease")');
    }
  }

  computeStockDelta(): number {
    switch (this.type) {
      case 'in':
        return this.quantity;
      case 'out':
        return -this.quantity;
      case 'adjustment':
        return this.adjustmentDirection === 'increase' ? this.quantity : -this.quantity;
      default:
        throw new Error(`Movement type "${this.type}" is not supported`);
    }
  }
}
