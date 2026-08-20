import { Injectable } from '@nestjs/common';
import { MinimumStockPrismaRepository } from '../../infrastructure/minimum-stock.prisma.repository';
import { MinimumStockResponseDto } from '../../dto/minimum-stock-response.dto';
import { toMinimumStockResponseDto } from '../minimum-stock-response.mapper';
import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';
import { PaginatedResponseDto } from '../../../../common/dto/paginated-response.dto';
import { buildPaginatedResponse, toPrismaSkipTake } from '../../../../common/utils/pagination.util';

// HU-11 — GET /inventory/minimum-stock, added alongside the plan's
// POST/PATCH: without a listing, there's no way for the admin screen to
// show which products already have a threshold (and thus need PATCH, not
// POST) versus which don't yet. Same TT-19 pagination as every other
// listing endpoint — unlike GET /alerts (HU-12), this one has no
// aggregation, so real DB-level pagination is straightforward here.
@Injectable()
export class ListMinimumStockUseCase {
  constructor(private readonly minimumStockRepository: MinimumStockPrismaRepository) {}

  async execute(query: PaginationQueryDto): Promise<PaginatedResponseDto<MinimumStockResponseDto>> {
    const { skip, take } = toPrismaSkipTake(query);
    const { items, total } = await this.minimumStockRepository.findAllPaginated(skip, take);
    return buildPaginatedResponse(items.map(toMinimumStockResponseDto), total, query);
  }
}
