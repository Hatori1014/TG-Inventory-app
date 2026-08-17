import { BadRequestException, Injectable } from '@nestjs/common';
import { BatchPrismaRepository } from '../../infrastructure/batch.prisma.repository';
import { InventoryPrismaRepository } from '../../infrastructure/inventory.prisma.repository';
import { BatchResponseDto } from '../../dto/batch-response.dto';
import { toBatchResponseDto } from '../batch-response.mapper';
import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';
import { PaginatedResponseDto } from '../../../../common/dto/paginated-response.dto';
import { buildPaginatedResponse, toPrismaSkipTake } from '../../../../common/utils/pagination.util';

@Injectable()
export class ListBatchesUseCase {
  constructor(
    private readonly batchRepository: BatchPrismaRepository,
    private readonly inventoryRepository: InventoryPrismaRepository,
  ) {}

  async execute(productId: string, query: PaginationQueryDto): Promise<PaginatedResponseDto<BatchResponseDto>> {
    const requiresBatch = await this.inventoryRepository.findProductRequiresBatch(productId);
    if (requiresBatch === null) {
      throw new BadRequestException('productId does not exist');
    }

    const { skip, take } = toPrismaSkipTake(query);
    const { items, total } = await this.batchRepository.findByProductPaginated(productId, skip, take);
    return buildPaginatedResponse(items.map(toBatchResponseDto), total, query);
  }
}
