import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { CreateBatchUseCase } from './application/use-cases/create-batch.use-case';
import { ListBatchesUseCase } from './application/use-cases/list-batches.use-case';
import { CreateBatchDto } from './dto/create-batch.dto';
import { BatchResponseDto } from './dto/batch-response.dto';

// Master plan section 7.4: both /inventory/batches endpoints are "Admin
// Inventario" — GET included, same criterion as HU-06/07 (not the "any
// authenticated" GET of HU-28's catalogs).
@ApiTags('inventory')
@Controller('inventory/batches')
export class BatchesController {
  constructor(
    private readonly createBatchUseCase: CreateBatchUseCase,
    private readonly listBatchesUseCase: ListBatchesUseCase,
  ) {}

  @RequirePermission('inventory', 'create')
  @Post()
  create(@Body() dto: CreateBatchDto): Promise<BatchResponseDto> {
    return this.createBatchUseCase.execute(dto);
  }

  @RequirePermission('inventory', 'read')
  @Get(':productId')
  listByProduct(
    @Param('productId') productId: string,
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<BatchResponseDto>> {
    return this.listBatchesUseCase.execute(productId, query);
  }
}
