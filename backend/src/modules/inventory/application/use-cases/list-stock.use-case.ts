import { Injectable } from '@nestjs/common';
import { InventoryPrismaRepository } from '../../infrastructure/inventory.prisma.repository';
import { StockResponseDto } from '../../dto/stock-response.dto';
import { StockQueryDto } from '../../dto/stock-query.dto';
import { toStockResponseDto } from '../stock-response.mapper';
import { PaginatedResponseDto } from '../../../../common/dto/paginated-response.dto';
import { buildPaginatedResponse, toPrismaSkipTake } from '../../../../common/utils/pagination.util';

@Injectable()
export class ListStockUseCase {
  constructor(private readonly inventoryRepository: InventoryPrismaRepository) {}

  async execute(query: StockQueryDto): Promise<PaginatedResponseDto<StockResponseDto>> {
    const { skip, take } = toPrismaSkipTake(query);
    const { items, total } = await this.inventoryRepository.findStockPaginated(skip, take, {
      productId: query.productId,
      locationId: query.locationId,
    });
    return buildPaginatedResponse(items.map(toStockResponseDto), total, query);
  }
}
