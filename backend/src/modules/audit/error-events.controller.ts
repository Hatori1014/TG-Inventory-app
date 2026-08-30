import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { ListErrorEventsUseCase } from './application/use-cases/list-error-events.use-case';
import { ListErrorEventsQueryDto } from './dto/list-error-events-query.dto';
import { ErrorEventResponseDto } from './dto/error-event-response.dto';

// HU-31 — read side of the error log. Write side (RecordErrorEventUseCase)
// is only ever called from GlobalExceptionFilter — there is no POST here,
// same reasoning as AuditController: a log clients could write to
// directly wouldn't be trustworthy.
@ApiTags('errors')
@Controller('error-events')
export class ErrorEventsController {
  constructor(private readonly listErrorEventsUseCase: ListErrorEventsUseCase) {}

  @RequirePermission('errors', 'read')
  @Get()
  list(@Query() query: ListErrorEventsQueryDto): Promise<PaginatedResponseDto<ErrorEventResponseDto>> {
    return this.listErrorEventsUseCase.execute(query);
  }
}
