import { Injectable } from '@nestjs/common';
import { RequestPrismaRepository } from '../../infrastructure/request.prisma.repository';
import { RequestResponseDto } from '../../dto/request-response.dto';
import { RequestQueryDto } from '../../dto/request-query.dto';
import { toRequestResponseDto } from '../request-response.mapper';
import { PaginatedResponseDto } from '../../../../common/dto/paginated-response.dto';
import { buildPaginatedResponse, toPrismaSkipTake } from '../../../../common/utils/pagination.util';

// HU-15 — GET /requests. Plan section 7.4 says "propias o todas, según
// rol" — HU-15/16 only ever need "propias" (a requester listing their own
// requests); the "todas" half (an approver seeing what's waiting on them)
// belongs to HU-17, which will extend this use-case rather than
// reimplementing pagination/filtering from scratch.
@Injectable()
export class ListRequestsUseCase {
  constructor(private readonly requestRepository: RequestPrismaRepository) {}

  async execute(requesterId: string, query: RequestQueryDto): Promise<PaginatedResponseDto<RequestResponseDto>> {
    const { skip, take } = toPrismaSkipTake(query);
    const { items, total } = await this.requestRepository.findAllPaginated(skip, take, {
      requesterId,
      type: query.type,
      status: query.status,
    });
    return buildPaginatedResponse(items.map(toRequestResponseDto), total, query);
  }
}
