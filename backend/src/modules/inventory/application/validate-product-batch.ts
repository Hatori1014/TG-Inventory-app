import { BadRequestException } from '@nestjs/common';
import { InventoryPrismaRepository } from '../infrastructure/inventory.prisma.repository';

// HU-09 — shared by RegisterMovementUseCase and RegisterTransferUseCase:
// a product with requiresBatch = true can't be moved without a batchId,
// and a supplied batchId must actually belong to that product (nothing at
// the DB level stops a mismatched combination — Batch.productId and
// InventoryMovement.batchId are independent FKs).
export async function validateProductAndBatch(
  inventoryRepository: InventoryPrismaRepository,
  productId: string,
  batchId: string | undefined,
): Promise<void> {
  const requiresBatch = await inventoryRepository.findProductRequiresBatch(productId);
  if (requiresBatch === null) {
    throw new BadRequestException('productId does not exist');
  }
  if (requiresBatch && !batchId) {
    throw new BadRequestException('batchId is required for this product');
  }

  if (batchId) {
    const batchProductId = await inventoryRepository.findBatchProductId(batchId);
    if (!batchProductId) {
      throw new BadRequestException('batchId does not exist');
    }
    if (batchProductId !== productId) {
      throw new BadRequestException('batchId does not belong to productId');
    }
  }
}
