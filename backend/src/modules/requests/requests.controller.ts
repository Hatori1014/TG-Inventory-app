import { Body, Controller, Get, Param, Patch, Post, Query, UseInterceptors } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { Idempotent } from '../../common/decorators/idempotent.decorator';
import { IdempotencyInterceptor } from '../../common/interceptors/idempotency.interceptor';
import { CurrentUser, AuthenticatedRequestUser } from '../../common/decorators/current-user.decorator';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { CreateRequestUseCase } from './application/use-cases/create-request.use-case';
import { UpdateRequestUseCase } from './application/use-cases/update-request.use-case';
import { SubmitRequestUseCase } from './application/use-cases/submit-request.use-case';
import { ListRequestsUseCase } from './application/use-cases/list-requests.use-case';
import { GetRequestUseCase } from './application/use-cases/get-request.use-case';
import { CreateRequestDto } from './dto/create-request.dto';
import { UpdateRequestDto } from './dto/update-request.dto';
import { RequestQueryDto } from './dto/request-query.dto';
import { RequestResponseDto } from './dto/request-response.dto';

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

  @RequirePermission('requests', 'read')
  @Get(':id')
  get(@Param('id') id: string, @CurrentUser() user: AuthenticatedRequestUser): Promise<RequestResponseDto> {
    return this.getRequestUseCase.execute(id, user.id);
  }
}
