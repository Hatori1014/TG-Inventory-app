import { Injectable } from '@nestjs/common';
import { InventoryMovement, LocationStatus, LocationStock, Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { withOptimisticLock } from '../../../common/utils/optimistic-lock.util';

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

// Signals a lost optimistic-lock race (ADR-20) from inside the transaction
// callback, so Prisma rolls back the whole transaction — including the
// InventoryMovement row(s) — instead of leaving an orphaned movement behind
// a stock update that never landed. withOptimisticLock retries on `null`.
class VersionConflictError extends Error {}

// HU-08: a decrease (out/transfer_out/adjustment-decrease) that would leave
// LocationStock.quantity negative. Unlike VersionConflictError, this is
// never retried — the use-cases catch it and turn it into a 409 the caller
// should not blindly resubmit as-is.
export class InsufficientStockError extends Error {}

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

  // Shared by registerMovement and registerTransfer — the actual
  // find-or-create + optimistic-locked update, including the insufficient-
  // stock floor. Checking `existingStock.quantity` up front (rather than
  // only after a version conflict) is safe under concurrency: a concurrent
  // writer that changes the real quantity also bumps `version`, so our
  // updateMany below loses the race, throws VersionConflictError, and
  // withOptimisticLock retries this whole method with a fresh read — the
  // floor check re-runs against current data on every attempt.
  private async applyStockChange(
    tx: Prisma.TransactionClient,
    input: { productId: string; locationId: string; batchId?: string; delta: number },
  ): Promise<LocationStock> {
    // findFirst, not findUnique: the generated compound-unique input for
    // productId_locationId_batchId requires batchId: string (no null
    // allowed), even though the column itself is nullable and the DB
    // unique index treats it correctly (same reasoning as
    // LocationPrismaRepository.findByParentAndName in HU-06).
    const existingStock = await tx.locationStock.findFirst({
      where: {
        productId: input.productId,
        locationId: input.locationId,
        batchId: input.batchId ?? null,
      },
    });

    if (!existingStock) {
      if (input.delta < 0) {
        throw new InsufficientStockError();
      }
      return tx.locationStock.create({
        data: {
          productId: input.productId,
          locationId: input.locationId,
          batchId: input.batchId,
          quantity: input.delta,
        },
      });
    }

    if (input.delta < 0 && Number(existingStock.quantity) + input.delta < 0) {
      throw new InsufficientStockError();
    }

    const updateResult = await tx.locationStock.updateMany({
      where: { id: existingStock.id, version: existingStock.version },
      data: { quantity: { increment: input.delta }, version: { increment: 1 } },
    });

    if (updateResult.count === 0) {
      throw new VersionConflictError();
    }

    return tx.locationStock.findUniqueOrThrow({ where: { id: existingStock.id } });
  }

  // convenciones.md: "nunca se actualiza LocationStock directo — siempre a
  // través de un registro en InventoryMovement en la misma transacción."
  // The movement is the ledger (source of truth); LocationStock is a derived
  // cache updated alongside it, guarded by TT-17's version column.
  async registerMovement(
    input: RegisterMovementInput,
  ): Promise<{ movement: InventoryMovement; stock: LocationStock }> {
    return withOptimisticLock(async () => {
      try {
        return await this.prisma.$transaction(async (tx) => {
          const movement = await tx.inventoryMovement.create({
            data: {
              productId: input.productId,
              locationId: input.locationId,
              batchId: input.batchId,
              type: input.type,
              quantity: input.quantity,
              userId: input.userId,
              notes: input.notes,
            },
          });

          const stock = await this.applyStockChange(tx, {
            productId: input.productId,
            locationId: input.locationId,
            batchId: input.batchId,
            delta: input.delta,
          });

          return { movement, stock };
        });
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
          const outMovement = await tx.inventoryMovement.create({
            data: {
              productId: input.productId,
              locationId: input.sourceLocationId,
              batchId: input.batchId,
              type: 'transfer_out',
              quantity: input.quantity,
              userId: input.userId,
              notes: input.notes,
            },
          });
          const sourceStock = await this.applyStockChange(tx, {
            productId: input.productId,
            locationId: input.sourceLocationId,
            batchId: input.batchId,
            delta: -input.quantity,
          });

          const inMovement = await tx.inventoryMovement.create({
            data: {
              productId: input.productId,
              locationId: input.destinationLocationId,
              batchId: input.batchId,
              type: 'transfer_in',
              quantity: input.quantity,
              userId: input.userId,
              notes: input.notes,
            },
          });
          const destinationStock = await this.applyStockChange(tx, {
            productId: input.productId,
            locationId: input.destinationLocationId,
            batchId: input.batchId,
            delta: input.quantity,
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

  async findStockPaginated(skip: number, take: number): Promise<{ items: LocationStock[]; total: number }> {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.locationStock.findMany({ skip, take, orderBy: { id: 'asc' } }),
      this.prisma.locationStock.count(),
    ]);
    return { items, total };
  }
}
