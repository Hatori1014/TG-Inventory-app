import { Injectable, NotFoundException } from '@nestjs/common';
import { PurchasePrismaRepository } from '../../infrastructure/purchase.prisma.repository';
import { PurchaseResponseDto } from '../../dto/purchase-response.dto';
import { toPurchaseResponseDto } from '../purchase-response.mapper';
import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';
import { PaginatedResponseDto } from '../../../../common/dto/paginated-response.dto';
import { buildPaginatedResponse, toPrismaSkipTake } from '../../../../common/utils/pagination.util';

// HU-05 — "Histórico de compras del proveedor" (plan section 7.4):
// GET /suppliers/:id/purchases, a distinct endpoint from HU-13's generic
// GET /purchases (which also supports a supplierId filter — this one is
// the dedicated URL the plan itself specifies, and 404s on a supplier that
// doesn't exist at all, vs. an empty list for one that exists but has no
// purchases yet, per the HU's own literal criterion.
@Injectable()
export class GetSupplierPurchaseHistoryUseCase {
  constructor(private readonly purchaseRepository: PurchasePrismaRepository) {}

  async execute(supplierId: string, query: PaginationQueryDto): Promise<PaginatedResponseDto<PurchaseResponseDto>> {
    const supplierStatus = await this.purchaseRepository.findSupplierStatus(supplierId);
    if (!supplierStatus) {
      throw new NotFoundException(`Supplier ${supplierId} not found`);
    }

    const { skip, take } = toPrismaSkipTake(query);
    const { items, total } = await this.purchaseRepository.findAllPaginated(skip, take, { supplierId });
    return buildPaginatedResponse(items.map(toPurchaseResponseDto), total, query);
  }
}
