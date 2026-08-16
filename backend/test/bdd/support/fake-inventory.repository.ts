import { randomUUID } from 'crypto';
import { LocationStatus } from '@prisma/client';
import { RegisterMovementInput } from '../../../src/modules/inventory/infrastructure/inventory.prisma.repository';

// In-memory stand-in for InventoryPrismaRepository — never touches Postgres
// (CI has no database service). Does not simulate the optimistic-lock retry
// race itself (that's covered by inventory.prisma.repository.spec.ts and
// optimistic-lock.util.spec.ts) — this fake only needs to exercise the
// business flow: location existence/status, FK validation, and the
// movement+stock pairing.
export class FakeInventoryRepository {
  private readonly locationStatuses = new Map<string, LocationStatus>();
  private readonly validProductIds = new Set<string>();
  private readonly stock = new Map<string, { id: string; productId: string; locationId: string; batchId: string | null; quantity: number }>();
  private readonly movements: any[] = [];

  seedLocation(id: string, status: LocationStatus = 'active'): void {
    this.locationStatuses.set(id, status);
  }

  seedProduct(id: string): void {
    this.validProductIds.add(id);
  }

  async findLocationStatus(locationId: string): Promise<LocationStatus | null> {
    return this.locationStatuses.get(locationId) ?? null;
  }

  async registerMovement(input: RegisterMovementInput) {
    if (!this.validProductIds.has(input.productId)) {
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
    this.movements.push(movement);

    const key = `${input.productId}|${input.locationId}|${input.batchId ?? ''}`;
    const existing = this.stock.get(key);
    if (!existing) {
      const stock = {
        id: randomUUID(),
        productId: input.productId,
        locationId: input.locationId,
        batchId: input.batchId ?? null,
        quantity: input.delta,
      };
      this.stock.set(key, stock);
      return { movement, stock };
    }

    const updated = { ...existing, quantity: existing.quantity + input.delta };
    this.stock.set(key, updated);
    return { movement, stock: updated };
  }

  async findStockPaginated(skip: number, take: number) {
    const all = [...this.stock.values()];
    return { items: all.slice(skip, skip + take), total: all.length };
  }
}
