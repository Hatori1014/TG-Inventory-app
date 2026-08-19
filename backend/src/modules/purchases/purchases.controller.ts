import { Body, Controller, Get, Param, Post, Query, UseInterceptors } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { Idempotent } from '../../common/decorators/idempotent.decorator';
import { IdempotencyInterceptor } from '../../common/interceptors/idempotency.interceptor';
import { CurrentUser, AuthenticatedRequestUser } from '../../common/decorators/current-user.decorator';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { RegisterPurchaseUseCase } from './application/use-cases/register-purchase.use-case';
import { ListPurchasesUseCase } from './application/use-cases/list-purchases.use-case';
import { GetPurchaseUseCase } from './application/use-cases/get-purchase.use-case';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { PurchaseQueryDto } from './dto/purchase-query.dto';
import { PurchaseResponseDto } from './dto/purchase-response.dto';

// Master plan section 7.4: all three endpoints are "Comprador" minimum.
// POST is idempotent (TT-18, ADR-21, at the user's explicit request) — a
// duplicate purchase from a network retry must not duplicate either the
// purchase record or the inventory movements it generates.
@ApiTags('purchases')
@Controller('purchases')
export class PurchasesController {
  constructor(
    private readonly registerPurchaseUseCase: RegisterPurchaseUseCase,
    private readonly listPurchasesUseCase: ListPurchasesUseCase,
    private readonly getPurchaseUseCase: GetPurchaseUseCase,
  ) {}

  @RequirePermission('purchases', 'read')
  @Get()
  list(@Query() query: PurchaseQueryDto): Promise<PaginatedResponseDto<PurchaseResponseDto>> {
    return this.listPurchasesUseCase.execute(query);
  }

  @RequirePermission('purchases', 'create')
  @Idempotent()
  @UseInterceptors(IdempotencyInterceptor)
  @Post()
  create(
    @Body() dto: CreatePurchaseDto,
    @CurrentUser() user: AuthenticatedRequestUser,
  ): Promise<PurchaseResponseDto> {
    return this.registerPurchaseUseCase.execute(dto, user.id);
  }

  @RequirePermission('purchases', 'read')
  @Get(':id')
  get(@Param('id') id: string): Promise<PurchaseResponseDto> {
    return this.getPurchaseUseCase.execute(id);
  }
}
