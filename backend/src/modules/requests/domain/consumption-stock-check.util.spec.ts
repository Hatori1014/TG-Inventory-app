import { findInsufficientStockItems } from './consumption-stock-check.util';

describe('findInsufficientStockItems', () => {
  it('returns nothing when every item requests no more than what is available', () => {
    const result = findInsufficientStockItems([
      { productId: 'p1', locationId: 'l1', requestedQuantity: 5, availableQuantity: 10 },
    ]);

    expect(result).toEqual([]);
  });

  it('returns nothing when the requested quantity exactly matches the available stock', () => {
    const result = findInsufficientStockItems([
      { productId: 'p1', locationId: 'l1', requestedQuantity: 10, availableQuantity: 10 },
    ]);

    expect(result).toEqual([]);
  });

  it('flags an item that requests more than is available', () => {
    const result = findInsufficientStockItems([
      { productId: 'p1', locationId: 'l1', requestedQuantity: 15, availableQuantity: 10 },
    ]);

    expect(result).toEqual([{ productId: 'p1', locationId: 'l1', requestedQuantity: 15, availableQuantity: 10 }]);
  });

  it('flags an item requesting stock at a location that has none at all', () => {
    const result = findInsufficientStockItems([
      { productId: 'p1', locationId: 'l1', requestedQuantity: 1, availableQuantity: 0 },
    ]);

    expect(result).toHaveLength(1);
  });

  it('flags only the offending items among several', () => {
    const result = findInsufficientStockItems([
      { productId: 'p1', locationId: 'l1', requestedQuantity: 5, availableQuantity: 10 },
      { productId: 'p2', locationId: 'l1', requestedQuantity: 20, availableQuantity: 10 },
    ]);

    expect(result.map((r) => r.productId)).toEqual(['p2']);
  });
});
