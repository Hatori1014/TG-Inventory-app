import { Injectable } from '@nestjs/common';
import { RequestPrismaRepository } from '../../infrastructure/request.prisma.repository';
import { RequestResponseDto } from '../../dto/request-response.dto';
import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';
import { toRequestResponseDto } from '../request-response.mapper';
import { PaginatedResponseDto } from '../../../../common/dto/paginated-response.dto';
import { buildPaginatedResponse, toPrismaSkipTake } from '../../../../common/utils/pagination.util';

// HU-17 — GET /requests/pending-approval, gated requests:approve at the
// controller: the "todas, según rol" half of plan section 7.4 that HU-15/16
// deferred — every request (any requester) awaiting a decision, not just
// the caller's own.
@Injectable()
export class ListPendingApprovalRequestsUseCase {
  constructor(private readonly requestRepository: RequestPrismaRepository) {}

  async execute(query: PaginationQueryDto): Promise<PaginatedResponseDto<RequestResponseDto>> {
    const { skip, take } = toPrismaSkipTake(query);
    const { items, total } = await this.requestRepository.findAllPaginated(skip, take, {
      statusIn: ['pending', 'in_review'],
    });
    return buildPaginatedResponse(items.map(toRequestResponseDto), total, query);
  }
}
