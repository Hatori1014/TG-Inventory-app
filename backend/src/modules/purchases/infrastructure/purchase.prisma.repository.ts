import { Injectable } from '@nestjs/common';
import { LocationStatus, SupplierStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { withOptimisticLock } from '../../../common/utils/optimistic-lock.util';
import { createMovementAndApplyStock, VersionConflictError } from '../../../common/utils/inventory-ledger.util';
import { purchaseWithRelations, PurchaseWithRelations } from '../application/purchase-response.mapper';
import { ProductPriceHistoryEntry, SupplierPriceEntry } from '../domain/price-comparison.util';

export interface CreatePurchaseItemData {
  productId: string;
  locationId: string;
  batchNumber?: string;
  batchExpiresAt?: string;
  quantity: number;
  unitPrice: number;
}

export interface CreatePurchaseData {
  supplierId: string;
  userId: string;
  items: CreatePurchaseItemData[];
}

// No domain/repository *interface* (port/Symbol) — convenciones.md reserves
// that for modules with real business logic needing to swap adapters; here
// the transactional write itself IS the business logic (ADR-17: entities in
// domain/ compute, this orchestrates the actual persistence).
@Injectable()
export class PurchasePrismaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findSupplierStatus(supplierId: string): Promise<SupplierStatus | null> {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id: supplierId },
      select: { status: true },
    });
    return supplier?.status ?? null;
  }

  // Duplicated from InventoryPrismaRepository rather than imported — ADR-18
  // forbids purchases/ from importing inventory/infrastructure/ directly,
  // and these are trivial single-table reads, not the "motor" the user
  // asked not to reimplement (that's createMovementAndApplyStock, shared
  // via common/).
  async findProductRequiresBatch(productId: string): Promise<boolean | null> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { requiresBatch: true },
    });
    return product?.requiresBatch ?? null;
  }

  async findLocationStatus(locationId: string): Promise<LocationStatus | null> {
    const location = await this.prisma.location.findUnique({
      where: { id: locationId },
      select: { status: true },
    });
    return location?.status ?? null;
  }

  // HU-14 — same duplication rationale as findProductRequiresBatch above:
  // a trivial single-table read, not the reusable "motor".
  async findProductName(productId: string): Promise<string | null> {
    const product = await this.prisma.product.findUnique({ where: { id: productId }, select: { name: true } });
    return product?.name ?? null;
  }

  // View 1 (plan section 7.4: "comparar el precio de un mismo producto
  // entre distintos proveedores") — every purchase ever made of this
  // product, across every supplier; buildProductPriceComparison() (domain
  // layer) reduces this to one row per supplier, latest price only.
  async findProductPriceHistory(productId: string): Promise<ProductPriceHistoryEntry[]> {
    const items = await this.prisma.purchaseItem.findMany({
      where: { productId },
      select: {
        unitPrice: true,
        purchase: { select: { supplierId: true, purchasedAt: true, supplier: { select: { name: true } } } },
      },
    });
    return items.map((item) => ({
      supplierId: item.purchase.supplierId,
      supplierName: item.purchase.supplier.name,
      unitPrice: Number(item.unitPrice),
      purchasedAt: item.purchase.purchasedAt,
    }));
  }

  async findSuppliersBasicInfo(supplierIds: string[]): Promise<{ id: string; name: string }[]> {
    return this.prisma.supplier.findMany({ where: { id: { in: supplierIds } }, select: { id: true, name: true } });
  }

  // View 2, DoR resolved by the user: not scoped to a single product — every
  // purchase item across every product these suppliers have ever sold.
  // buildMonthlyAveragePriceComparison() (domain layer) groups by month.
  async findSupplierPriceHistory(supplierIds: string[]): Promise<SupplierPriceEntry[]> {
    const items = await this.prisma.purchaseItem.findMany({
      where: { purchase: { supplierId: { in: supplierIds } } },
      select: { unitPrice: true, purchase: { select: { supplierId: true, purchasedAt: true } } },
    });
    return items.map((item) => ({
      supplierId: item.purchase.supplierId,
      unitPrice: Number(item.unitPrice),
      purchasedAt: item.purchase.purchasedAt,
    }));
  }

  async findById(id: string): Promise<PurchaseWithRelations | null> {
    return this.prisma.purchase.findUnique({ where: { id }, include: purchaseWithRelations.include });
  }

  async findAllPaginated(
    skip: number,
    take: number,
    filters?: { supplierId?: string },
  ): Promise<{ items: PurchaseWithRelations[]; total: number }> {
    const where = { ...(filters?.supplierId && { supplierId: filters.supplierId }) };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.purchase.findMany({
        where,
        skip,
        take,
        orderBy: { purchasedAt: 'desc' },
        include: purchaseWithRelations.include,
      }),
      this.prisma.purchase.count({ where }),
    ]);
    return { items, total };
  }

  // The whole point of this HU: one atomic transaction for the Purchase,
  // every PurchaseItem, every batch that needs creating, and every
  // InventoryMovement/LocationStock update they trigger. If anything fails
  // partway — a version conflict on item 3 of 5, say — everything rolls
  // back, including items 1 and 2 already written in this attempt, and
  // withOptimisticLock retries the whole transaction from scratch (same
  // pattern as HU-08's atomic transfer). status is set to 'received'
  // immediately, not 'registered': this HU generates the movements as part
  // of registering, there's no separate two-step goods-receipt flow (yet) —
  // 'registered' stays in the enum for a future HU that might add one.
  async registerPurchase(input: CreatePurchaseData): Promise<PurchaseWithRelations> {
    return withOptimisticLock(async () => {
      try {
        return await this.prisma.$transaction(async (tx) => {
          const purchase = await tx.purchase.create({
            data: { supplierId: input.supplierId, userId: input.userId, status: 'received' },
          });

          for (const item of input.items) {
            let batchId: string | undefined;
            if (item.batchNumber) {
              const existingBatch = await tx.batch.findFirst({
                where: { productId: item.productId, batchNumber: item.batchNumber },
              });
              batchId = existingBatch
                ? existingBatch.id
                : (
                    await tx.batch.create({
                      data: {
                        productId: item.productId,
                        batchNumber: item.batchNumber,
                        // Same conversion as BatchPrismaRepository.create()
                        // (HU-09) — Prisma's DateTime input needs a real
                        // Date, not the raw ISO string the DTO carries.
                        expiresAt: item.batchExpiresAt ? new Date(item.batchExpiresAt) : undefined,
                      },
                    })
                  ).id;
            }

            await tx.purchaseItem.create({
              data: {
                purchaseId: purchase.id,
                productId: item.productId,
                locationId: item.locationId,
                batchId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
              },
            });

            await createMovementAndApplyStock(tx, {
              productId: item.productId,
              locationId: item.locationId,
              batchId,
              type: 'in',
              quantity: item.quantity,
              delta: item.quantity,
              userId: input.userId,
              purchaseId: purchase.id,
            });
          }

          return tx.purchase.findUniqueOrThrow({ where: { id: purchase.id }, include: purchaseWithRelations.include });
        });
      } catch (error) {
        if (error instanceof VersionConflictError) {
          return null;
        }
        throw error;
      }
    });
  }
}
