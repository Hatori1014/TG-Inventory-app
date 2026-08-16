export type MovementType = 'in' | 'out' | 'transfer_in' | 'transfer_out' | 'adjustment';

// Entity with behavior (ADR-17) — computeStockDelta() is the actual business
// rule of what a movement does to LocationStock.quantity. HU-07 only wires
// up 'in' (associate/initialize stock at a location, the first real
// consumer of TT-17/TT-18); HU-08 adds out/transfer_in/transfer_out/adjustment
// on top of this same entity.
export class MovementRequest {
  constructor(
    private readonly type: MovementType,
    private readonly quantity: number,
  ) {
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error('Movement quantity must be a positive number');
    }
  }

  computeStockDelta(): number {
    switch (this.type) {
      case 'in':
        return this.quantity;
      default:
        throw new Error(`Movement type "${this.type}" is not supported yet`);
    }
  }
}
