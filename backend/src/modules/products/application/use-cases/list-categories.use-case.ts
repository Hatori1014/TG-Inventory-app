import { Injectable } from '@nestjs/common';
import { CategoryPrismaRepository } from '../../infrastructure/category.prisma.repository';
import { CategoryResponseDto } from '../../dto/category-response.dto';
import { toCategoryResponseDto } from '../category-response.mapper';
import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';
import { PaginatedResponseDto } from '../../../../common/dto/paginated-response.dto';
import { buildPaginatedResponse, toPrismaSkipTake } from '../../../../common/utils/pagination.util';

@Injectable()
export class ListCategoriesUseCase {
  constructor(private readonly categoryRepository: CategoryPrismaRepository) {}

  async execute(query: PaginationQueryDto): Promise<PaginatedResponseDto<CategoryResponseDto>> {
    const { skip, take } = toPrismaSkipTake(query);
    const { items, total } = await this.categoryRepository.findAllPaginated(skip, take);
    return buildPaginatedResponse(items.map(toCategoryResponseDto), total, query);
  }
}
