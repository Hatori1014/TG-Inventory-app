import { Injectable } from '@nestjs/common';
import { ErrorEventPrismaRepository } from '../../infrastructure/error-event.prisma.repository';
import { ErrorEventResponseDto } from '../../dto/error-event-response.dto';
import { ListErrorEventsQueryDto } from '../../dto/list-error-events-query.dto';
import { toErrorEventResponseDto } from '../error-event-response.mapper';
import { PaginatedResponseDto } from '../../../../common/dto/paginated-response.dto';
import { buildPaginatedResponse, toPrismaSkipTake } from '../../../../common/utils/pagination.util';

@Injectable()
export class ListErrorEventsUseCase {
  constructor(private readonly errorEventRepository: ErrorEventPrismaRepository) {}

  async execute(query: ListErrorEventsQueryDto): Promise<PaginatedResponseDto<ErrorEventResponseDto>> {
    const { skip, take } = toPrismaSkipTake(query);
    const { items, total } = await this.errorEventRepository.findAllPaginated(skip, take, {
      module: query.module,
      action: query.action,
    });
    return buildPaginatedResponse(items.map(toErrorEventResponseDto), total, query);
  }
}
