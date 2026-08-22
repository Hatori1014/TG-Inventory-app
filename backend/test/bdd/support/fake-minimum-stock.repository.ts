import { randomUUID } from 'crypto';
import { MinimumStockWithProduct } from '../../../src/modules/inventory/application/minimum-stock-response.mapper';
import { ProductStockSummary } from '../../../src/modules/inventory/domain/stock-alert.util';

// In-memory stand-in for MinimumStockPrismaRepository — never touches
// Postgres (CI has no database service). Independent from
// FakeInventoryRepository/FakeBatchRepository, same reasoning as those:
// different endpoints, BDD scenarios seed this one directly. seedStock()
// is a test-only helper that sets a location's quantity for a product
// without going through the real movement/transaction machinery (same
// pattern as FakePurchaseRepository.seedPurchase()).
export class FakeMinimumStockRepository {
  private readonly products = new Map<string, string>();
  private readonly stock: { productId: string; locationId: string; quantity: number }[] = [];
  private readonly minimums = new Map<string, MinimumStockWithProduct>();

  seedProduct(id: string, name: string): void {
    this.products.set(id, name);
  }

  seedStock(productId: string, locationId: string, quantity: number): void {
    this.stock.push({ productId, locationId, quantity });
  }

  async findProductName(productId: string): Promise<string | null> {
    return this.products.get(productId) ?? null;
  }

  async create(data: { productId: string; minimumQuantity: number }): Promise<MinimumStockWithProduct> {
    const minimumStock = {
      id: randomUUID(),
      productId: data.productId,
      product: { id: data.productId, name: this.products.get(data.productId) ?? data.productId },
      minimumQuantity: data.minimumQuantity,
    } as unknown as MinimumStockWithProduct;
    this.minimums.set(minimumStock.id, minimumStock);
    return minimumStock;
  }

  async update(id: string, minimumQuantity: number): Promise<MinimumStockWithProduct> {
    const existing = this.minimums.get(id) as MinimumStockWithProduct;
    const updated = { ...existing, minimumQuantity } as unknown as MinimumStockWithProduct;
    this.minimums.set(id, updated);
    return updated;
  }

  async findById(id: string): Promise<MinimumStockWithProduct | null> {
    return this.minimums.get(id) ?? null;
  }

  async findByProductId(productId: string): Promise<MinimumStockWithProduct | null> {
    return [...this.minimums.values()].find((m) => m.productId === productId) ?? null;
  }

  async findAllPaginated(skip: number, take: number): Promise<{ items: MinimumStockWithProduct[]; total: number }> {
    const all = [...this.minimums.values()];
    return { items: all.slice(skip, skip + take), total: all.length };
  }

  async findAllWithStockSums(): Promise<ProductStockSummary[]> {
    return [...this.minimums.values()].map((m) => {
      const total = this.stock.filter((s) => s.productId === m.productId).reduce((sum, s) => sum + s.quantity, 0);
      return {
        productId: m.productId,
        productName: m.product.name,
        minimumQuantity: Number(m.minimumQuantity),
        totalQuantity: total,
      };
    });
  }
}
