import { RequestItemInput } from './request-item-input.value-object';

describe('RequestItemInput', () => {
  it('constructs a valid item', () => {
    const item = new RequestItemInput('product-1', 'location-1', 5, 12.5);

    expect(item.getProductId()).toBe('product-1');
    expect(item.getLocationId()).toBe('location-1');
    expect(item.getQuantity()).toBe(5);
    expect(item.getEstimatedPrice()).toBe(12.5);
  });

  it('allows an item without an estimated price', () => {
    const item = new RequestItemInput('product-1', 'location-1', 5);

    expect(item.getEstimatedPrice()).toBeUndefined();
  });

  it('rejects a zero quantity', () => {
    expect(() => new RequestItemInput('product-1', 'location-1', 0)).toThrow(
      'Request item quantity must be a positive number',
    );
  });

  it('rejects a negative quantity', () => {
    expect(() => new RequestItemInput('product-1', 'location-1', -1)).toThrow(
      'Request item quantity must be a positive number',
    );
  });

  it('rejects a negative estimated price', () => {
    expect(() => new RequestItemInput('product-1', 'location-1', 5, -1)).toThrow(
      'Request item estimated price cannot be negative',
    );
  });
});
