import { MovementRequest } from './movement-request.entity';

describe('MovementRequest', () => {
  it('computes a positive stock delta for an "in" movement', () => {
    const request = new MovementRequest('in', 10);

    expect(request.computeStockDelta()).toBe(10);
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

  it('throws for a movement type not supported yet (reserved for HU-08)', () => {
    const request = new MovementRequest('out', 5);

    expect(() => request.computeStockDelta()).toThrow('Movement type "out" is not supported yet');
  });
});
