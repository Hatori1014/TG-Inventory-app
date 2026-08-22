import { Body, Controller, Get, Param, Patch, Post, Query, UseInterceptors } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { Idempotent } from '../../common/decorators/idempotent.decorator';
import { IdempotencyInterceptor } from '../../common/interceptors/idempotency.interceptor';
import { CurrentUser, AuthenticatedRequestUser } from '../../common/decorators/current-user.decorator';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { CreateRequestUseCase } from './application/use-cases/create-request.use-case';
import { UpdateRequestUseCase } from './application/use-cases/update-request.use-case';
import { SubmitRequestUseCase } from './application/use-cases/submit-request.use-case';
import { ListRequestsUseCase } from './application/use-cases/list-requests.use-case';
import { GetRequestUseCase } from './application/use-cases/get-request.use-case';
import { ApproveRequestUseCase } from './application/use-cases/approve-request.use-case';
import { RejectRequestUseCase } from './application/use-cases/reject-request.use-case';
import { IntegrateRequestUseCase } from './application/use-cases/integrate-request.use-case';
import { ListPendingApprovalRequestsUseCase } from './application/use-cases/list-pending-approval-requests.use-case';
import { ListPendingIntegrationRequestsUseCase } from './application/use-cases/list-pending-integration-requests.use-case';
import { CreateRequestDto } from './dto/create-request.dto';
import { UpdateRequestDto } from './dto/update-request.dto';
import { RequestQueryDto } from './dto/request-query.dto';
import { RequestResponseDto } from './dto/request-response.dto';
import { ApproveRequestDto } from './dto/approve-request.dto';
import { RejectRequestDto } from './dto/reject-request.dto';
import { IntegrateRequestDto } from './dto/integrate-request.dto';

// HU-15 — plan section 7.4 marks /requests "Solicitante" minimum, GET
// included. PATCH :id (edit a draft) and PATCH :id/submit aren't in the
// plan's own endpoint table — added because a request that starts as a
// draft needs a way to be edited and later submitted; both stay under
// requests:create (editing/submitting your own draft is part of the
// creation workflow, not a separate permission tier). POST is idempotent
// (TT-18, same reasoning as HU-13's purchases) — a network retry must not
// create the same request twice.
@ApiTags('requests')
@Controller('requests')
export class RequestsController {
  constructor(
    private readonly createRequestUseCase: CreateRequestUseCase,
    private readonly updateRequestUseCase: UpdateRequestUseCase,
    private readonly submitRequestUseCase: SubmitRequestUseCase,
    private readonly listRequestsUseCase: ListRequestsUseCase,
    private readonly getRequestUseCase: GetRequestUseCase,
    private readonly approveRequestUseCase: ApproveRequestUseCase,
    private readonly rejectRequestUseCase: RejectRequestUseCase,
    private readonly integrateRequestUseCase: IntegrateRequestUseCase,
    private readonly listPendingApprovalRequestsUseCase: ListPendingApprovalRequestsUseCase,
    private readonly listPendingIntegrationRequestsUseCase: ListPendingIntegrationRequestsUseCase,
  ) {}

  @RequirePermission('requests', 'create')
  @Idempotent()
  @UseInterceptors(IdempotencyInterceptor)
  @Post()
  create(
    @Body() dto: CreateRequestDto,
    @CurrentUser() user: AuthenticatedRequestUser,
  ): Promise<RequestResponseDto> {
    return this.createRequestUseCase.execute(user.id, dto);
  }

  @RequirePermission('requests', 'create')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRequestDto,
    @CurrentUser() user: AuthenticatedRequestUser,
  ): Promise<RequestResponseDto> {
    return this.updateRequestUseCase.execute(id, user.id, dto);
  }

  @RequirePermission('requests', 'create')
  @Patch(':id/submit')
  submit(@Param('id') id: string, @CurrentUser() user: AuthenticatedRequestUser): Promise<RequestResponseDto> {
    return this.submitRequestUseCase.execute(id, user.id);
  }

  @RequirePermission('requests', 'read')
  @Get()
  list(
    @Query() query: RequestQueryDto,
    @CurrentUser() user: AuthenticatedRequestUser,
  ): Promise<PaginatedResponseDto<RequestResponseDto>> {
    return this.listRequestsUseCase.execute(user.id, query);
  }

  // HU-17 — the "todas, según rol" half of plan section 7.4: literal
  // routes, registered before ':id' so they aren't swallowed by it.
  @RequirePermission('requests', 'approve')
  @Get('pending-approval')
  listPendingApproval(@Query() query: PaginationQueryDto): Promise<PaginatedResponseDto<RequestResponseDto>> {
    return this.listPendingApprovalRequestsUseCase.execute(query);
  }

  @RequirePermission('requests', 'integrate')
  @Get('pending-integration')
  listPendingIntegration(@Query() query: PaginationQueryDto): Promise<PaginatedResponseDto<RequestResponseDto>> {
    return this.listPendingIntegrationRequestsUseCase.execute(query);
  }

  @RequirePermission('requests', 'read')
  @Get(':id')
  get(@Param('id') id: string, @CurrentUser() user: AuthenticatedRequestUser): Promise<RequestResponseDto> {
    return this.getRequestUseCase.execute(id, user.id);
  }

  // HU-17 — parallel multi-approval: this call casts one vote; whether it
  // resolves the request (quorum reached) is decided atomically inside the
  // use-case. Idempotent (TT-18) — a network retry must not cast the same
  // approver's vote twice (that's also guarded by the DB's own unique
  // constraint, but the idempotency key avoids ever exercising that path
  // for what the client sees as a single click).
  @RequirePermission('requests', 'approve')
  @Idempotent()
  @UseInterceptors(IdempotencyInterceptor)
  @Patch(':id/approve')
  approve(
    @Param('id') id: string,
    @Body() dto: ApproveRequestDto,
    @CurrentUser() user: AuthenticatedRequestUser,
  ): Promise<RequestResponseDto> {
    return this.approveRequestUseCase.execute(id, user.id, dto.comment);
  }

  @RequirePermission('requests', 'approve')
  @Idempotent()
  @UseInterceptors(IdempotencyInterceptor)
  @Patch(':id/reject')
  reject(
    @Param('id') id: string,
    @Body() dto: RejectRequestDto,
    @CurrentUser() user: AuthenticatedRequestUser,
  ): Promise<RequestResponseDto> {
    return this.rejectRequestUseCase.execute(id, user.id, dto.comment);
  }

  // HU-17 — a different permission than approve, at the user's explicit
  // request ("el pendiente de integrar al inventario pasaría a manejarlo
  // el admin de inventarios"): approving and integrating can be different
  // people.
  @RequirePermission('requests', 'integrate')
  @Idempotent()
  @UseInterceptors(IdempotencyInterceptor)
  @Patch(':id/integrate')
  integrate(
    @Param('id') id: string,
    @Body() dto: IntegrateRequestDto,
    @CurrentUser() user: AuthenticatedRequestUser,
  ): Promise<RequestResponseDto> {
    return this.integrateRequestUseCase.execute(id, user.id, dto);
  }
}
