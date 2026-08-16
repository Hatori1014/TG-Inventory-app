import { Injectable } from '@nestjs/common';
import { InventoryPrismaRepository } from '../../infrastructure/inventory.prisma.repository';
import { StockResponseDto } from '../../dto/stock-response.dto';
import { toStockResponseDto } from '../stock-response.mapper';
import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';
import { PaginatedResponseDto } from '../../../../common/dto/paginated-response.dto';
import { buildPaginatedResponse, toPrismaSkipTake } from '../../../../common/utils/pagination.util';

@Injectable()
export class ListStockUseCase {
  constructor(private readonly inventoryRepository: InventoryPrismaRepository) {}

  async execute(query: PaginationQueryDto): Promise<PaginatedResponseDto<StockResponseDto>> {
    const { skip, take } = toPrismaSkipTake(query);
    const { items, total } = await this.inventoryRepository.findStockPaginated(skip, take);
    return buildPaginatedResponse(items.map(toStockResponseDto), total, query);
  }
}
