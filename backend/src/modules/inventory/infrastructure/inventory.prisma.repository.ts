import { Injectable } from '@nestjs/common';
import { InventoryMovement, LocationStatus, LocationStock } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { withOptimisticLock } from '../../../common/utils/optimistic-lock.util';
import { MovementType } from '../domain/movement-request.entity';

export interface RegisterMovementInput {
  productId: string;
  locationId: string;
  batchId?: string;
  type: MovementType;
  quantity: number;
  delta: number;
  userId: string;
  notes?: string;
}

// Signals a lost optimistic-lock race (ADR-20) from inside the transaction
// callback, so Prisma rolls back the whole transaction — including the
// InventoryMovement row — instead of leaving an orphaned movement behind a
// stock update that never landed. withOptimisticLock retries on `null`.
class VersionConflictError extends Error {}

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

          // findFirst, not findUnique: the generated compound-unique input
          // for productId_locationId_batchId requires batchId: string (no
          // null allowed), even though the column itself is nullable and
          // the DB unique index treats it correctly (same reasoning as
          // LocationPrismaRepository.findByParentAndName in HU-06).
          const existingStock = await tx.locationStock.findFirst({
            where: {
              productId: input.productId,
              locationId: input.locationId,
              batchId: input.batchId ?? null,
            },
          });

          if (!existingStock) {
            const stock = await tx.locationStock.create({
              data: {
                productId: input.productId,
                locationId: input.locationId,
                batchId: input.batchId,
                quantity: input.delta,
              },
            });
            return { movement, stock };
          }

          const updateResult = await tx.locationStock.updateMany({
            where: { id: existingStock.id, version: existingStock.version },
            data: { quantity: { increment: input.delta }, version: { increment: 1 } },
          });

          if (updateResult.count === 0) {
            throw new VersionConflictError();
          }

          const stock = await tx.locationStock.findUniqueOrThrow({ where: { id: existingStock.id } });
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

  async findStockPaginated(skip: number, take: number): Promise<{ items: LocationStock[]; total: number }> {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.locationStock.findMany({ skip, take, orderBy: { id: 'asc' } }),
      this.prisma.locationStock.count(),
    ]);
    return { items, total };
  }
}
