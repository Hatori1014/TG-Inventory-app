// Value Object (ADR-17) — immutable, self-validates at construction. One
// line of a purchase: what was bought, how much, at what price, and where
// it lands. batchNumber is a human-entered lot code, not a batchId — HU-13
// looks it up (and creates it if missing) inside the transaction, unlike
// HU-08/09's batchId which must reference a batch that already exists.
export class PurchaseItemRequest {
  constructor(
    private readonly productId: string,
    private readonly locationId: string,
    private readonly quantity: number,
    private readonly unitPrice: number,
    private readonly batchNumber?: string,
    private readonly batchExpiresAt?: string,
  ) {
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error('Purchase item quantity must be a positive number');
    }
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      throw new Error('Purchase item unit price cannot be negative');
    }
  }

  getProductId(): string {
    return this.productId;
  }

  getLocationId(): string {
    return this.locationId;
  }

  getQuantity(): number {
    return this.quantity;
  }

  getUnitPrice(): number {
    return this.unitPrice;
  }

  getBatchNumber(): string | undefined {
    return this.batchNumber;
  }

  getBatchExpiresAt(): string | undefined {
    return this.batchExpiresAt;
  }

  getSubtotal(): number {
    return this.quantity * this.unitPrice;
  }
}
