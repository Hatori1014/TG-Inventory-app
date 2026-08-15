import { Injectable } from '@nestjs/common';
import { ProductPrismaRepository } from '../../infrastructure/product.prisma.repository';
import { ProductResponseDto } from '../../dto/product-response.dto';
import { toProductResponseDto } from '../product-response.mapper';
import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';
import { PaginatedResponseDto } from '../../../../common/dto/paginated-response.dto';
import { buildPaginatedResponse, toPrismaSkipTake } from '../../../../common/utils/pagination.util';

@Injectable()
export class ListProductsUseCase {
  constructor(private readonly productRepository: ProductPrismaRepository) {}

  async execute(query: PaginationQueryDto): Promise<PaginatedResponseDto<ProductResponseDto>> {
    const { skip, take } = toPrismaSkipTake(query);
    const { items, total } = await this.productRepository.findAllPaginated(skip, take);
    return buildPaginatedResponse(items.map(toProductResponseDto), total, query);
  }
}
