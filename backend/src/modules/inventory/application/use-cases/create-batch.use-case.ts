import { BadRequestException, Injectable } from '@nestjs/common';
import { BatchPrismaRepository } from '../../infrastructure/batch.prisma.repository';
import { InventoryPrismaRepository } from '../../infrastructure/inventory.prisma.repository';
import { CreateBatchDto } from '../../dto/create-batch.dto';
import { BatchResponseDto } from '../../dto/batch-response.dto';
import { toBatchResponseDto } from '../batch-response.mapper';

// HU-09 — "Crear lote (si el producto lo requiere)" (plan section 7.4):
// batches only make sense for products with requiresBatch = true.
@Injectable()
export class CreateBatchUseCase {
  constructor(
    private readonly batchRepository: BatchPrismaRepository,
    private readonly inventoryRepository: InventoryPrismaRepository,
  ) {}

  async execute(dto: CreateBatchDto): Promise<BatchResponseDto> {
    const requiresBatch = await this.inventoryRepository.findProductRequiresBatch(dto.productId);
    if (requiresBatch === null) {
      throw new BadRequestException('productId does not exist');
    }
    if (!requiresBatch) {
      throw new BadRequestException('This product does not require batch tracking (requiresBatch is false)');
    }

    const batch = await this.batchRepository.create({
      productId: dto.productId,
      batchNumber: dto.batchNumber,
      expiresAt: dto.expiresAt,
      receivedAt: dto.receivedAt,
    });
    return toBatchResponseDto(batch);
  }
}
