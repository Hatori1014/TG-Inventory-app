import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { CreateMinimumStockUseCase } from './application/use-cases/create-minimum-stock.use-case';
import { UpdateMinimumStockUseCase } from './application/use-cases/update-minimum-stock.use-case';
import { ListMinimumStockUseCase } from './application/use-cases/list-minimum-stock.use-case';
import { CreateMinimumStockDto } from './dto/create-minimum-stock.dto';
import { UpdateMinimumStockDto } from './dto/update-minimum-stock.dto';
import { MinimumStockResponseDto } from './dto/minimum-stock-response.dto';

// HU-11 — plan section 7.4 marks all /inventory/minimum-stock endpoints
// "Admin Inventario", same tier as /inventory/batches (HU-09) — GET
// included, so :read is required here too, not "any authenticated" like
// GET /inventory/stock.
@ApiTags('inventory')
@Controller('inventory/minimum-stock')
export class MinimumStockController {
  constructor(
    private readonly createMinimumStockUseCase: CreateMinimumStockUseCase,
    private readonly updateMinimumStockUseCase: UpdateMinimumStockUseCase,
    private readonly listMinimumStockUseCase: ListMinimumStockUseCase,
  ) {}

  @RequirePermission('inventory', 'create')
  @Post()
  create(@Body() dto: CreateMinimumStockDto): Promise<MinimumStockResponseDto> {
    return this.createMinimumStockUseCase.execute(dto);
  }

  @RequirePermission('inventory', 'update')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateMinimumStockDto): Promise<MinimumStockResponseDto> {
    return this.updateMinimumStockUseCase.execute(id, dto);
  }

  @RequirePermission('inventory', 'read')
  @Get()
  list(@Query() query: PaginationQueryDto): Promise<PaginatedResponseDto<MinimumStockResponseDto>> {
    return this.listMinimumStockUseCase.execute(query);
  }
}
