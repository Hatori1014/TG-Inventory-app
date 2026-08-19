import { randomUUID } from 'crypto';
import { LocationStatus, SupplierStatus } from '@prisma/client';
import { PurchaseWithRelations } from '../../../src/modules/purchases/application/purchase-response.mapper';
import {
  CreatePurchaseData,
} from '../../../src/modules/purchases/infrastructure/purchase.prisma.repository';

// In-memory stand-in for PurchasePrismaRepository — never touches Postgres
// (CI has no database service). Unlike other Fake repositories in this
// suite, this one also simulates the ledger side effect
// (createMovementAndApplyStock) internally via a plain stock map, since
// wiring the real InventoryModule into these BDD tests would cross the
// same module boundary (ADR-18) PurchasePrismaRepository itself can't
// cross — getStockFor() is a test-only inspection helper, not part of the
// real repository's surface.
export class FakePurchaseRepository {
  private readonly suppliers = new Map<string, { name: string; status: SupplierStatus }>();
  private readonly products = new Map<string, { name: string; requiresBatch: boolean }>();
  private readonly locations = new Map<string, { name: string; status: LocationStatus }>();
  private readonly batchesByProductAndNumber = new Map<string, { id: string; batchNumber: string }>();
  private readonly stock = new Map<string, number>();
  private readonly purchases = new Map<string, PurchaseWithRelations>();

  seedSupplier(id: string, name: string, status: SupplierStatus = 'active'): void {
    this.suppliers.set(id, { name, status });
  }

  seedProduct(id: string, name: string, requiresBatch = false): void {
    this.products.set(id, { name, requiresBatch });
  }

  seedLocation(id: string, name: string, status: LocationStatus = 'active'): void {
    this.locations.set(id, { name, status });
  }

  // HU-05 — for scenarios that need a specific purchasedAt to prove sort
  // order deterministically (registerPurchase() always stamps `now()`,
  // too close together across two calls in the same test to be reliable).
  seedPurchase(supplierId: string, purchasedAt: Date, totalAmount = 0): string {
    const supplier = this.suppliers.get(supplierId);
    const id = randomUUID();
    this.purchases.set(id, {
      id,
      supplierId,
      supplier: { id: supplierId, name: supplier?.name ?? supplierId },
      userId: 'seed-user',
      purchasedAt,
      status: 'received',
      items: totalAmount
        ? [
            {
              id: randomUUID(),
              productId: 'seed-product',
              product: { id: 'seed-product', name: 'Seed Product' },
              locationId: 'seed-location',
              location: { id: 'seed-location', name: 'Seed Location' },
              batchId: null,
              batch: null,
              quantity: 1,
              unitPrice: totalAmount,
            },
          ]
        : [],
    } as unknown as PurchaseWithRelations);
    return id;
  }

  getStockFor(productId: string, locationId: string, batchId: string | null = null): number {
    return this.stock.get(this.stockKey(productId, locationId, batchId)) ?? 0;
  }

  async findSupplierStatus(id: string): Promise<SupplierStatus | null> {
    return this.suppliers.get(id)?.status ?? null;
  }

  async findProductRequiresBatch(id: string): Promise<boolean | null> {
    return this.products.get(id)?.requiresBatch ?? (this.products.has(id) ? false : null);
  }

  async findLocationStatus(id: string): Promise<LocationStatus | null> {
    return this.locations.get(id)?.status ?? null;
  }

  async findById(id: string): Promise<PurchaseWithRelations | null> {
    return this.purchases.get(id) ?? null;
  }

  async findAllPaginated(
    skip: number,
    take: number,
    filters?: { supplierId?: string },
  ): Promise<{ items: PurchaseWithRelations[]; total: number }> {
    let all = [...this.purchases.values()];
    if (filters?.supplierId) {
      all = all.filter((p) => p.supplierId === filters.supplierId);
    }
    // Same order as the real repository (HU-05: "orden descendente por
    // fecha") — a Map preserves insertion order, not chronological order,
    // so this needs an explicit sort.
    all = all.sort((a, b) => b.purchasedAt.getTime() - a.purchasedAt.getTime());
    return { items: all.slice(skip, skip + take), total: all.length };
  }

  async registerPurchase(input: CreatePurchaseData): Promise<PurchaseWithRelations> {
    const items = input.items.map((item) => {
      let batch: { id: string; batchNumber: string } | undefined;
      if (item.batchNumber) {
        const key = `${item.productId}|${item.batchNumber}`;
        batch = this.batchesByProductAndNumber.get(key);
        if (!batch) {
          batch = { id: randomUUID(), batchNumber: item.batchNumber };
          this.batchesByProductAndNumber.set(key, batch);
        }
      }

      const stockKey = this.stockKey(item.productId, item.locationId, batch?.id ?? null);
      this.stock.set(stockKey, (this.stock.get(stockKey) ?? 0) + item.quantity);

      const product = this.products.get(item.productId);
      const location = this.locations.get(item.locationId);

      return {
        id: randomUUID(),
        productId: item.productId,
        product: { id: item.productId, name: product?.name ?? item.productId },
        locationId: item.locationId,
        location: { id: item.locationId, name: location?.name ?? item.locationId },
        batchId: batch?.id ?? null,
        batch: batch ? { id: batch.id, batchNumber: batch.batchNumber } : null,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      };
    });

    const supplier = this.suppliers.get(input.supplierId);
    const purchase = {
      id: randomUUID(),
      supplierId: input.supplierId,
      supplier: { id: input.supplierId, name: supplier?.name ?? input.supplierId },
      userId: input.userId,
      purchasedAt: new Date(),
      status: 'received' as const,
      items,
    };
    this.purchases.set(purchase.id, purchase as unknown as PurchaseWithRelations);
    return purchase as unknown as PurchaseWithRelations;
  }

  private stockKey(productId: string, locationId: string, batchId: string | null): string {
    return `${productId}|${locationId}|${batchId ?? ''}`;
  }
}
