import { Body, Controller, Get, Post, Query, UseInterceptors } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { Idempotent } from '../../common/decorators/idempotent.decorator';
import { IdempotencyInterceptor } from '../../common/interceptors/idempotency.interceptor';
import { CurrentUser, AuthenticatedRequestUser } from '../../common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { RegisterMovementUseCase } from './application/use-cases/register-movement.use-case';
import { RegisterTransferUseCase } from './application/use-cases/register-transfer.use-case';
import { ListStockUseCase } from './application/use-cases/list-stock.use-case';
import { CreateMovementDto } from './dto/create-movement.dto';
import { MovementResponseDto } from './dto/movement-response.dto';
import { TransferResponseDto } from './dto/transfer-response.dto';
import { StockResponseDto } from './dto/stock-response.dto';

// Master plan section 7.4: POST /inventory/movements is "Admin Inventario"
// (write, critical — TDD/BDD per convenciones.md), GET /inventory/stock is
// "cualquier autenticado" (same criterion as HU-28's products GET).
@ApiTags('inventory')
@Controller('inventory')
export class InventoryController {
  constructor(
    private readonly registerMovementUseCase: RegisterMovementUseCase,
    private readonly registerTransferUseCase: RegisterTransferUseCase,
    private readonly listStockUseCase: ListStockUseCase,
  ) {}

  // "transfer" is one endpoint per the master plan ("entrada/salida/
  // traslado/ajuste" all through POST /inventory/movements) but a distinct
  // dual-location operation under the hood (ADR-28) — routed to its own
  // use-case rather than branching inside RegisterMovementUseCase.
  @RequirePermission('inventory', 'create')
  @Idempotent()
  @UseInterceptors(IdempotencyInterceptor)
  @Post('movements')
  create(
    @Body() dto: CreateMovementDto,
    @CurrentUser() user: AuthenticatedRequestUser,
  ): Promise<MovementResponseDto | TransferResponseDto> {
    if (dto.type === 'transfer') {
      return this.registerTransferUseCase.execute(dto, user.id);
    }
    return this.registerMovementUseCase.execute(dto, user.id);
  }

  @Get('stock')
  listStock(@Query() query: PaginationQueryDto): Promise<PaginatedResponseDto<StockResponseDto>> {
    return this.listStockUseCase.execute(query);
  }
}
