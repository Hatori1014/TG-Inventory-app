import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { ListAuditEventsUseCase } from './application/use-cases/list-audit-events.use-case';
import { ListAuditEventsQueryDto } from './dto/list-audit-events-query.dto';
import { AuditEventResponseDto } from './dto/audit-event-response.dto';

// HU-23 — read side of the audit panel. Write side (RecordAuditEventUseCase)
// lives in this same module but is only ever called from AuthModule,
// RolesModule and RequestsModule — there is no POST here, an audit trail
// that clients could write to directly wouldn't be trustworthy.
@ApiTags('audit')
@Controller('audit-events')
export class AuditController {
  constructor(private readonly listAuditEventsUseCase: ListAuditEventsUseCase) {}

  @RequirePermission('audit', 'read')
  @Get()
  list(@Query() query: ListAuditEventsQueryDto): Promise<PaginatedResponseDto<AuditEventResponseDto>> {
    return this.listAuditEventsUseCase.execute(query);
  }
}
