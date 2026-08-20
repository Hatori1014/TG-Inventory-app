import { Injectable } from '@nestjs/common';
import { PurchasePrismaRepository } from '../../infrastructure/purchase.prisma.repository';
import { PurchaseResponseDto } from '../../dto/purchase-response.dto';
import { toPurchaseResponseDto } from '../purchase-response.mapper';
import { PurchaseQueryDto } from '../../dto/purchase-query.dto';
import { PaginatedResponseDto } from '../../../../common/dto/paginated-response.dto';
import { buildPaginatedResponse, toPrismaSkipTake } from '../../../../common/utils/pagination.util';

@Injectable()
export class ListPurchasesUseCase {
  constructor(private readonly purchaseRepository: PurchasePrismaRepository) {}

  async execute(query: PurchaseQueryDto): Promise<PaginatedResponseDto<PurchaseResponseDto>> {
    const { skip, take } = toPrismaSkipTake(query);
    const { items, total } = await this.purchaseRepository.findAllPaginated(skip, take, {
      supplierId: query.supplierId,
    });
    return buildPaginatedResponse(items.map(toPurchaseResponseDto), total, query);
  }
}
