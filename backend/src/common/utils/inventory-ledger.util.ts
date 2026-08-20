import { InventoryMovement, LocationStock, MovementType, Prisma } from '@prisma/client';

// Shared by inventory (HU-07/08's registerMovement/registerTransfer) and
// purchases (HU-13) — both need to write an InventoryMovement + update
// LocationStock atomically alongside their own module's rows (a Purchase +
// its items, in HU-13's case), inside ONE transaction. It has to live here,
// not in inventory/infrastructure/, because ADR-18's module boundaries
// forbid `purchases` from importing another module's infrastructure — this
// is the one place both are allowed to depend on. convenciones.md: "nunca
// se actualiza LocationStock directo — siempre a través de un registro en
// InventoryMovement en la misma transacción."

// HU-08 — a decrease that would leave LocationStock.quantity negative.
// Never retried — callers translate it to a 409 the caller shouldn't
// blindly resubmit as-is.
export class InsufficientStockError extends Error {}

// Signals a lost optimistic-lock race (ADR-20) from inside a transaction
// callback, so the caller's `prisma.$transaction` rolls back everything —
// including the InventoryMovement row and any of the caller's own rows
// (e.g. Purchase/PurchaseItem) — instead of leaving something orphaned.
// Callers pair this with withOptimisticLock, which retries on `null`.
export class VersionConflictError extends Error {}

export interface CreateMovementAndApplyStockInput {
  productId: string;
  locationId: string;
  batchId?: string;
  type: MovementType;
  quantity: number;
  delta: number;
  userId: string;
  notes?: string;
  purchaseId?: string;
}

export async function createMovementAndApplyStock(
  tx: Prisma.TransactionClient,
  input: CreateMovementAndApplyStockInput,
): Promise<{ movement: InventoryMovement; stock: LocationStock }> {
  const movement = await tx.inventoryMovement.create({
    data: {
      productId: input.productId,
      locationId: input.locationId,
      batchId: input.batchId,
      type: input.type,
      quantity: input.quantity,
      userId: input.userId,
      notes: input.notes,
      purchaseId: input.purchaseId,
    },
  });

  const stock = await applyStockChange(tx, {
    productId: input.productId,
    locationId: input.locationId,
    batchId: input.batchId,
    delta: input.delta,
  });

  return { movement, stock };
}

// Checking `existingStock.quantity` up front (rather than only after a
// version conflict) is safe under concurrency: a concurrent writer that
// changes the real quantity also bumps `version`, so our updateMany below
// loses the race, throws VersionConflictError, and the caller's
// withOptimisticLock retries the whole transaction — the floor check
// re-runs against current data on every attempt.
async function applyStockChange(
  tx: Prisma.TransactionClient,
  input: { productId: string; locationId: string; batchId?: string; delta: number },
): Promise<LocationStock> {
  // findFirst, not findUnique: the generated compound-unique input for
  // productId_locationId_batchId requires batchId: string (no null
  // allowed), even though the column itself is nullable and the DB unique
  // index treats it correctly (same reasoning as
  // LocationPrismaRepository.findByParentAndName, HU-06).
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
