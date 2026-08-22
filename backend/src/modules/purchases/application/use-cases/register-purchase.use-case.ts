import { BadRequestException, Injectable } from '@nestjs/common';
import { PurchasePrismaRepository } from '../../infrastructure/purchase.prisma.repository';
import { CreatePurchaseDto } from '../../dto/create-purchase.dto';
import { PurchaseResponseDto } from '../../dto/purchase-response.dto';
import { toPurchaseResponseDto } from '../purchase-response.mapper';
import { PurchaseRequest } from '../../domain/purchase-request.entity';
import { PurchaseItemRequest } from '../../domain/purchase-item-request.value-object';

// HU-13, at the user's explicit request: reuses the movement engine from
// HU-07/08 (via the shared createMovementAndApplyStock, see
// common/utils/inventory-ledger.util.ts) instead of reimplementing stock
// writes, and validates batch requirements the same way HU-09's
// validateProductAndBatch does — except a missing batch is created, not
// rejected, since receiving a purchase is naturally when a new lot starts
// existing.
@Injectable()
export class RegisterPurchaseUseCase {
  constructor(private readonly purchaseRepository: PurchasePrismaRepository) {}

  async execute(dto: CreatePurchaseDto, userId: string, requestId?: string): Promise<PurchaseResponseDto> {
    const supplierStatus = await this.purchaseRepository.findSupplierStatus(dto.supplierId);
    if (!supplierStatus) {
      throw new BadRequestException('supplierId does not exist');
    }
    if (supplierStatus === 'inactive') {
      throw new BadRequestException('supplierId refers to an inactive supplier');
    }

    for (const item of dto.items) {
      const requiresBatch = await this.purchaseRepository.findProductRequiresBatch(item.productId);
      if (requiresBatch === null) {
        throw new BadRequestException(`productId ${item.productId} does not exist`);
      }
      if (requiresBatch && !item.batchNumber) {
        throw new BadRequestException(`batchNumber is required for product ${item.productId}`);
      }

      const locationStatus = await this.purchaseRepository.findLocationStatus(item.locationId);
      if (!locationStatus) {
        throw new BadRequestException(`locationId ${item.locationId} does not exist`);
      }
      if (locationStatus === 'inactive') {
        throw new BadRequestException(`locationId ${item.locationId} refers to an inactive location`);
      }
    }

    // Re-validates quantity/unitPrice (already checked by CreatePurchaseItemDto)
    // and computes the total via real domain behavior — not dead code, this
    // is the one place PurchaseRequest/PurchaseItemRequest actually run.
    new PurchaseRequest(
      dto.items.map(
        (item) =>
          new PurchaseItemRequest(
            item.productId,
            item.locationId,
            item.quantity,
            item.unitPrice,
            item.batchNumber,
            item.batchExpiresAt,
          ),
      ),
    );

    const purchase = await this.purchaseRepository.registerPurchase({
      supplierId: dto.supplierId,
      userId,
      requestId,
      items: dto.items.map((item) => ({
        productId: item.productId,
        locationId: item.locationId,
        batchNumber: item.batchNumber,
        batchExpiresAt: item.batchExpiresAt,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
    });

    return toPurchaseResponseDto(purchase);
  }
}
