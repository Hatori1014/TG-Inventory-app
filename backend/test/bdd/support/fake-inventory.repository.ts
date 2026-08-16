import { randomUUID } from 'crypto';
import { LocationStatus } from '@prisma/client';
import {
  InsufficientStockError,
  RegisterMovementInput,
  RegisterTransferInput,
} from '../../../src/modules/inventory/infrastructure/inventory.prisma.repository';

// In-memory stand-in for InventoryPrismaRepository — never touches Postgres
// (CI has no database service). Does not simulate the optimistic-lock retry
// race itself (that's covered by inventory.prisma.repository.spec.ts and
// optimistic-lock.util.spec.ts) — this fake exercises the business flow:
// location existence/status, FK validation, the insufficient-stock floor
// (HU-08), and the movement+stock pairing (including transfers).
export class FakeInventoryRepository {
  private readonly locationStatuses = new Map<string, LocationStatus>();
  private readonly products = new Map<string, { requiresBatch: boolean }>();
  private readonly batches = new Map<string, { productId: string }>();
  private readonly stock = new Map<string, { id: string; productId: string; locationId: string; batchId: string | null; quantity: number }>();
  private readonly movements: any[] = [];

  seedLocation(id: string, status: LocationStatus = 'active'): void {
    this.locationStatuses.set(id, status);
  }

  seedProduct(id: string, requiresBatch = false): void {
    this.products.set(id, { requiresBatch });
  }

  seedBatch(id: string, productId: string): void {
    this.batches.set(id, { productId });
  }

  seedStock(productId: string, locationId: string, quantity: number, batchId?: string): void {
    const key = `${productId}|${locationId}|${batchId ?? ''}`;
    this.stock.set(key, { id: randomUUID(), productId, locationId, batchId: batchId ?? null, quantity });
  }

  async findLocationStatus(locationId: string): Promise<LocationStatus | null> {
    return this.locationStatuses.get(locationId) ?? null;
  }

  async findProductRequiresBatch(productId: string): Promise<boolean | null> {
    return this.products.get(productId)?.requiresBatch ?? null;
  }

  async findBatchProductId(batchId: string): Promise<string | null> {
    return this.batches.get(batchId)?.productId ?? null;
  }

  private applyDelta(productId: string, locationId: string, batchId: string | undefined, delta: number) {
    const key = `${productId}|${locationId}|${batchId ?? ''}`;
    const existing = this.stock.get(key);

    if (!existing) {
      if (delta < 0) {
        throw new InsufficientStockError();
      }
      const stock = { id: randomUUID(), productId, locationId, batchId: batchId ?? null, quantity: delta };
      this.stock.set(key, stock);
      return stock;
    }

    if (delta < 0 && existing.quantity + delta < 0) {
      throw new InsufficientStockError();
    }

    const updated = { ...existing, quantity: existing.quantity + delta };
    this.stock.set(key, updated);
    return updated;
  }

  async registerMovement(input: RegisterMovementInput) {
    if (!this.products.has(input.productId)) {
      throw { code: 'P2003' };
    }

    const movement = {
      id: randomUUID(),
      productId: input.productId,
      locationId: input.locationId,
      batchId: input.batchId ?? null,
      type: input.type,
      quantity: input.quantity,
      userId: input.userId,
      occurredAt: new Date(),
      notes: input.notes ?? null,
    };

    const stock = this.applyDelta(input.productId, input.locationId, input.batchId, input.delta);
    this.movements.push(movement);
    return { movement, stock };
  }

  async registerTransfer(input: RegisterTransferInput) {
    if (!this.products.has(input.productId)) {
      throw { code: 'P2003' };
    }

    const outMovement = {
      id: randomUUID(),
      productId: input.productId,
      locationId: input.sourceLocationId,
      batchId: input.batchId ?? null,
      type: 'transfer_out',
      quantity: input.quantity,
      userId: input.userId,
      occurredAt: new Date(),
      notes: input.notes ?? null,
    };
    // Insufficient stock at the source must reject before touching the
    // destination — mirrors the real repository's same-transaction rollback.
    const sourceStock = this.applyDelta(input.productId, input.sourceLocationId, input.batchId, -input.quantity);

    const inMovement = {
      id: randomUUID(),
      productId: input.productId,
      locationId: input.destinationLocationId,
      batchId: input.batchId ?? null,
      type: 'transfer_in',
      quantity: input.quantity,
      userId: input.userId,
      occurredAt: new Date(),
      notes: input.notes ?? null,
    };
    const destinationStock = this.applyDelta(input.productId, input.destinationLocationId, input.batchId, input.quantity);

    this.movements.push(outMovement, inMovement);
    return { outMovement, inMovement, sourceStock, destinationStock };
  }

  async findStockPaginated(skip: number, take: number) {
    const all = [...this.stock.values()];
    return { items: all.slice(skip, skip + take), total: all.length };
  }
}
