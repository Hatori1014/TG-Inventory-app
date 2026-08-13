import { PaginatedResponseDto } from '../dto/paginated-response.dto';
import { PaginationQueryDto } from '../dto/pagination-query.dto';

// TT-19 — the only place page/pageSize get turned into Prisma's skip/take,
// so every module computes it the same way.
export function toPrismaSkipTake(query: PaginationQueryDto): { skip: number; take: number } {
  return {
    skip: (query.page - 1) * query.pageSize,
    take: query.pageSize,
  };
}

export function buildPaginatedResponse<T>(
  items: T[],
  total: number,
  query: PaginationQueryDto,
): PaginatedResponseDto<T> {
  return {
    items,
    total,
    page: query.page,
    pageSize: query.pageSize,
  };
}
