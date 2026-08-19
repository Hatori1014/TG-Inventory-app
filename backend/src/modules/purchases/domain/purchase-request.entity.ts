import { PurchaseItemRequest } from './purchase-item-request.value-object';

// Entity with behavior (ADR-17) — getTotalAmount() is the actual business
// rule of what a purchase costs; RegisterPurchaseUseCase orchestrates
// (validates supplier/products/locations, calls the repository) but does
// not compute the total itself.
export class PurchaseRequest {
  constructor(private readonly items: PurchaseItemRequest[]) {
    if (items.length === 0) {
      throw new Error('A purchase must have at least one item');
    }
  }

  getItems(): PurchaseItemRequest[] {
    return this.items;
  }

  getTotalAmount(): number {
    return this.items.reduce((sum, item) => sum + item.getSubtotal(), 0);
  }
}
