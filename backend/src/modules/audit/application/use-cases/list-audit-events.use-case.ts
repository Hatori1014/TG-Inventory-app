import { Injectable } from '@nestjs/common';
import { AuditEventPrismaRepository } from '../../infrastructure/audit-event.prisma.repository';
import { AuditEventResponseDto } from '../../dto/audit-event-response.dto';
import { ListAuditEventsQueryDto } from '../../dto/list-audit-events-query.dto';
import { toAuditEventResponseDto } from '../audit-event-response.mapper';
import { PaginatedResponseDto } from '../../../../common/dto/paginated-response.dto';
import { buildPaginatedResponse, toPrismaSkipTake } from '../../../../common/utils/pagination.util';

@Injectable()
export class ListAuditEventsUseCase {
  constructor(private readonly auditEventRepository: AuditEventPrismaRepository) {}

  async execute(query: ListAuditEventsQueryDto): Promise<PaginatedResponseDto<AuditEventResponseDto>> {
    const { skip, take } = toPrismaSkipTake(query);
    const { items, total } = await this.auditEventRepository.findAllPaginated(skip, take, {
      entity: query.entity,
      action: query.action,
      userId: query.userId,
    });
    return buildPaginatedResponse(items.map(toAuditEventResponseDto), total, query);
  }
}
