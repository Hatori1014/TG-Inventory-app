import { Injectable } from '@nestjs/common';
import { InventoryMovement, LocationStatus, LocationStock } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { withOptimisticLock } from '../../../common/utils/optimistic-lock.util';
import {
  createMovementAndApplyStock,
  InsufficientStockError,
  VersionConflictError,
} from '../../../common/utils/inventory-ledger.util';
import { StockWithNames } from '../application/stock-response.mapper';

// Re-exported so existing call sites (register-movement/transfer use-cases
// and their specs) don't need to change their import path — the real
// definitions moved to common/utils/inventory-ledger.util.ts (HU-13),
// shared with the purchases module, which can't import this file directly
// (ADR-18 module boundaries).
export { InsufficientStockError };

export interface RegisterMovementInput {
  productId: string;
  locationId: string;
  batchId?: string;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  delta: number;
  userId: string;
  notes?: string;
}

export interface RegisterTransferInput {
  productId: string;
  sourceLocationId: string;
  destinationLocationId: string;
  batchId?: string;
  quantity: number;
  userId: string;
  notes?: string;
}

@Injectable()
export class InventoryPrismaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findLocationStatus(locationId: string): Promise<LocationStatus | null> {
    const location = await this.prisma.location.findUnique({
      where: { id: locationId },
      select: { status: true },
    });
    return location?.status ?? null;
  }

  // HU-09 — null means productId doesn't exist; the boolean drives whether
  // a movement against this product must carry a batchId.
  async findProductRequiresBatch(productId: string): Promise<boolean | null> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { requiresBatch: true },
    });
    return product?.requiresBatch ?? null;
  }

  // HU-09 — a client-supplied batchId must both exist and belong to the
  // same product the movement is for; nothing at the DB level stops a
  // mismatched combination (Batch.productId and InventoryMovement.batchId
  // are independent FKs).
  async findBatchProductId(batchId: string): Promise<string | null> {
    const batch = await this.prisma.batch.findUnique({
      where: { id: batchId },
      select: { productId: true },
    });
    return batch?.productId ?? null;
  }

  // convenciones.md: "nunca se actualiza LocationStock directo — siempre a
  // través de un registro en InventoryMovement en la misma transacción."
  // The movement is the ledger (source of truth); LocationStock is a derived
  // cache updated alongside it, guarded by TT-17's version column. The
  // actual write (create movement + find-or-create/optimistic-update stock)
  // is createMovementAndApplyStock() (common/utils/inventory-ledger.util.ts,
  // HU-13) — shared with the purchases module, not reimplemented here.
  async registerMovement(
    input: RegisterMovementInput,
  ): Promise<{ movement: InventoryMovement; stock: LocationStock }> {
    return withOptimisticLock(async () => {
      try {
        return await this.prisma.$transaction((tx) =>
          createMovementAndApplyStock(tx, {
            productId: input.productId,
            locationId: input.locationId,
            batchId: input.batchId,
            type: input.type,
            quantity: input.quantity,
            delta: input.delta,
            userId: input.userId,
            notes: input.notes,
          }),
        );
      } catch (error) {
        if (error instanceof VersionConflictError) {
          return null;
        }
        throw error;
      }
    });
  }

  // HU-08 — "traslado" as one atomic operation (confirmed with the user,
  // ADR-28): transfer_out at the source and transfer_in at the destination
  // are created, and both LocationStock rows updated, in the same
  // transaction. A version conflict or insufficient stock on either leg
  // rolls back both — a transfer can never leave only one side applied.
  async registerTransfer(
    input: RegisterTransferInput,
  ): Promise<{
    outMovement: InventoryMovement;
    inMovement: InventoryMovement;
    sourceStock: LocationStock;
    destinationStock: LocationStock;
  }> {
    return withOptimisticLock(async () => {
      try {
        return await this.prisma.$transaction(async (tx) => {
          const { movement: outMovement, stock: sourceStock } = await createMovementAndApplyStock(tx, {
            productId: input.productId,
            locationId: input.sourceLocationId,
            batchId: input.batchId,
            type: 'transfer_out',
            quantity: input.quantity,
            delta: -input.quantity,
            userId: input.userId,
            notes: input.notes,
          });

          const { movement: inMovement, stock: destinationStock } = await createMovementAndApplyStock(tx, {
            productId: input.productId,
            locationId: input.destinationLocationId,
            batchId: input.batchId,
            type: 'transfer_in',
            quantity: input.quantity,
            delta: input.quantity,
            userId: input.userId,
            notes: input.notes,
          });

          return { outMovement, inMovement, sourceStock, destinationStock };
        });
      } catch (error) {
        if (error instanceof VersionConflictError) {
          return null;
        }
        throw error;
      }
    });
  }

  // HU-10 — filters are optional (plan section 7.4: "filtrable por
  // producto/ubicación"); include product/location names so the frontend
  // stock screen doesn't need a second round-trip per row (ADR-27 deferred
  // this enrichment to HU-10).
  async findStockPaginated(
    skip: number,
    take: number,
    filters?: { productId?: string; locationId?: string },
  ): Promise<{ items: StockWithNames[]; total: number }> {
    const where = {
      ...(filters?.productId && { productId: filters.productId }),
      ...(filters?.locationId && { locationId: filters.locationId }),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.locationStock.findMany({
        where,
        skip,
        take,
        orderBy: { id: 'asc' },
        include: {
          product: { select: { id: true, name: true } },
          location: { select: { id: true, name: true } },
        },
      }),
      this.prisma.locationStock.count({ where }),
    ]);
    return { items, total };
  }
}
