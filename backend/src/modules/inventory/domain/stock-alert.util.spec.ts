import { buildStockAlerts } from './stock-alert.util';

describe('buildStockAlerts', () => {
  it('includes a product whose total stock across locations is below its minimum', () => {
    const alerts = buildStockAlerts([
      { productId: 'p1', productName: 'Arroz', minimumQuantity: 10, totalQuantity: 9 },
    ]);

    expect(alerts).toEqual([{ productId: 'p1', productName: 'Arroz', minimumQuantity: 10, totalQuantity: 9, deficit: -1 }]);
  });

  it('includes a product whose total stock exactly equals its minimum (<=, not <)', () => {
    const alerts = buildStockAlerts([
      { productId: 'p1', productName: 'Arroz', minimumQuantity: 10, totalQuantity: 10 },
    ]);

    expect(alerts).toHaveLength(1);
  });

  it('excludes a product whose total stock is above its minimum', () => {
    const alerts = buildStockAlerts([
      { productId: 'p1', productName: 'Arroz', minimumQuantity: 10, totalQuantity: 11 },
    ]);

    expect(alerts).toEqual([]);
  });

  it('treats a product with no stock anywhere as 0, alerting against any positive minimum', () => {
    const alerts = buildStockAlerts([
      { productId: 'p1', productName: 'Arroz', minimumQuantity: 5, totalQuantity: 0 },
    ]);

    expect(alerts).toHaveLength(1);
  });

  it('sorts the most urgent (largest deficit) first', () => {
    const alerts = buildStockAlerts([
      { productId: 'p1', productName: 'Arroz', minimumQuantity: 10, totalQuantity: 9 },
      { productId: 'p2', productName: 'Sal', minimumQuantity: 3, totalQuantity: 0 },
      { productId: 'p3', productName: 'Agua', minimumQuantity: 20, totalQuantity: 5 },
    ]);

    expect(alerts.map((a) => a.productId)).toEqual(['p3', 'p2', 'p1']);
  });

  it('returns an empty array when nothing is below its minimum', () => {
    expect(buildStockAlerts([])).toEqual([]);
  });
});
