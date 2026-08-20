import { PurchaseItemRequest } from './purchase-item-request.value-object';

describe('PurchaseItemRequest', () => {
  it('computes the subtotal as quantity * unitPrice', () => {
    const item = new PurchaseItemRequest('product-1', 'location-1', 4, 12.5);

    expect(item.getSubtotal()).toBe(50);
  });

  it('accepts a zero unit price (e.g. a free sample)', () => {
    const item = new PurchaseItemRequest('product-1', 'location-1', 2, 0);

    expect(item.getSubtotal()).toBe(0);
  });

  it('throws when quantity is zero or negative', () => {
    expect(() => new PurchaseItemRequest('product-1', 'location-1', 0, 10)).toThrow(
      'Purchase item quantity must be a positive number',
    );
    expect(() => new PurchaseItemRequest('product-1', 'location-1', -3, 10)).toThrow(
      'Purchase item quantity must be a positive number',
    );
  });

  it('throws when unitPrice is negative', () => {
    expect(() => new PurchaseItemRequest('product-1', 'location-1', 5, -0.01)).toThrow(
      'Purchase item unit price cannot be negative',
    );
  });

  it('carries an optional batch number and expiry through unchanged', () => {
    const item = new PurchaseItemRequest('product-1', 'location-1', 1, 1, 'LOT-A1', '2027-01-01');

    expect(item.getBatchNumber()).toBe('LOT-A1');
    expect(item.getBatchExpiresAt()).toBe('2027-01-01');
  });
});
