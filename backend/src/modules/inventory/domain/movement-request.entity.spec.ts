import { MovementRequest } from './movement-request.entity';

describe('MovementRequest', () => {
  it('computes a positive stock delta for an "in" movement', () => {
    const request = new MovementRequest('in', 10);

    expect(request.computeStockDelta()).toBe(10);
  });

  it('computes a negative stock delta for an "out" movement', () => {
    const request = new MovementRequest('out', 10);

    expect(request.computeStockDelta()).toBe(-10);
  });

  it('computes a positive stock delta for an "adjustment" with direction "increase"', () => {
    const request = new MovementRequest('adjustment', 5, 'increase');

    expect(request.computeStockDelta()).toBe(5);
  });

  it('computes a negative stock delta for an "adjustment" with direction "decrease"', () => {
    const request = new MovementRequest('adjustment', 5, 'decrease');

    expect(request.computeStockDelta()).toBe(-5);
  });

  it('throws when an "adjustment" is built without a direction', () => {
    expect(() => new MovementRequest('adjustment', 5)).toThrow(
      'adjustment movements require a direction ("increase" or "decrease")',
    );
  });

  it('throws when the quantity is zero', () => {
    expect(() => new MovementRequest('in', 0)).toThrow('Movement quantity must be a positive number');
  });

  it('throws when the quantity is negative', () => {
    expect(() => new MovementRequest('in', -5)).toThrow('Movement quantity must be a positive number');
  });

  it('throws when the quantity is not finite', () => {
    expect(() => new MovementRequest('in', NaN)).toThrow('Movement quantity must be a positive number');
  });
});
