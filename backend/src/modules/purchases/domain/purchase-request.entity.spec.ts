import { PurchaseRequest } from './purchase-request.entity';
import { PurchaseItemRequest } from './purchase-item-request.value-object';

describe('PurchaseRequest', () => {
  it('sums the subtotal of every item for the total amount', () => {
    const purchase = new PurchaseRequest([
      new PurchaseItemRequest('product-1', 'location-1', 10, 2.5),
      new PurchaseItemRequest('product-2', 'location-1', 3, 4),
    ]);

    expect(purchase.getTotalAmount()).toBe(37);
  });

  it('throws when there are no items', () => {
    expect(() => new PurchaseRequest([])).toThrow('A purchase must have at least one item');
  });
});
