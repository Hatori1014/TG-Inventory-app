import { Injectable } from '@nestjs/common';
import { SupplierPrismaRepository } from '../../infrastructure/supplier.prisma.repository';
import { SupplierResponseDto } from '../../dto/supplier-response.dto';
import { toSupplierResponseDto } from '../supplier-response.mapper';
import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';
import { PaginatedResponseDto } from '../../../../common/dto/paginated-response.dto';
import { buildPaginatedResponse, toPrismaSkipTake } from '../../../../common/utils/pagination.util';

@Injectable()
export class ListSuppliersUseCase {
  constructor(private readonly supplierRepository: SupplierPrismaRepository) {}

  async execute(query: PaginationQueryDto): Promise<PaginatedResponseDto<SupplierResponseDto>> {
    const { skip, take } = toPrismaSkipTake(query);
    const { items, total } = await this.supplierRepository.findAllPaginated(skip, take);
    return buildPaginatedResponse(items.map(toSupplierResponseDto), total, query);
  }
}
