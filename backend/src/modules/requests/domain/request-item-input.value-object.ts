// Value Object (ADR-17) — immutable, self-validates at construction. One
// line of a request: what's wanted, how much, and where it should land
// (purchase) or come from (consumption, HU-16). Shared between both
// request types — estimatedPrice is optional (only meaningful for
// purchase, where it exists purely as a hint for the requester/approver,
// unlike Purchase's real unitPrice).
export class RequestItemInput {
  constructor(
    private readonly productId: string,
    private readonly locationId: string,
    private readonly quantity: number,
    private readonly estimatedPrice?: number,
  ) {
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error('Request item quantity must be a positive number');
    }
    if (estimatedPrice !== undefined && (!Number.isFinite(estimatedPrice) || estimatedPrice < 0)) {
      throw new Error('Request item estimated price cannot be negative');
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

  getEstimatedPrice(): number | undefined {
    return this.estimatedPrice;
  }
}
