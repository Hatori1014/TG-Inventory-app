import { Injectable } from '@nestjs/common';
import { RequestPrismaRepository } from '../../infrastructure/request.prisma.repository';
import { RequestResponseDto } from '../../dto/request-response.dto';
import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';
import { toRequestResponseDto } from '../request-response.mapper';
import { PaginatedResponseDto } from '../../../../common/dto/paginated-response.dto';
import { buildPaginatedResponse, toPrismaSkipTake } from '../../../../common/utils/pagination.util';

// HU-17 — GET /requests/pending-integration, gated requests:integrate at
// the controller: every approved purchase request waiting for the
// inventory admin's "Integrar al inventario" action. Consumption never
// reaches this status (its quorum-reached path jumps straight to closed),
// so no type filter is needed — status alone already scopes it correctly.
@Injectable()
export class ListPendingIntegrationRequestsUseCase {
  constructor(private readonly requestRepository: RequestPrismaRepository) {}

  async execute(query: PaginationQueryDto): Promise<PaginatedResponseDto<RequestResponseDto>> {
    const { skip, take } = toPrismaSkipTake(query);
    const { items, total } = await this.requestRepository.findAllPaginated(skip, take, {
      status: 'pending_inventory_integration',
    });
    return buildPaginatedResponse(items.map(toRequestResponseDto), total, query);
  }
}
