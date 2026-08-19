import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { CreateSupplierUseCase } from './application/use-cases/create-supplier.use-case';
import { ListSuppliersUseCase } from './application/use-cases/list-suppliers.use-case';
import { UpdateSupplierUseCase } from './application/use-cases/update-supplier.use-case';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SupplierResponseDto } from './dto/supplier-response.dto';

// Master plan section 7.4: all three endpoints require "Comprador" minimum
// (unlike HU-28's products, whose GET is any authenticated user) — so GET
// also carries @RequirePermission, same pattern as HU-02/03/HU-06. No
// "Comprador" role is actually seeded (same as "Admin Inventario" in
// HU-06/07/09) — PermissionsGuard checks the permission, not a role name;
// an admin can create that role for real via the existing /roles screen.
@ApiTags('suppliers')
@Controller('suppliers')
export class SuppliersController {
  constructor(
    private readonly createSupplierUseCase: CreateSupplierUseCase,
    private readonly listSuppliersUseCase: ListSuppliersUseCase,
    private readonly updateSupplierUseCase: UpdateSupplierUseCase,
  ) {}

  @RequirePermission('suppliers', 'read')
  @Get()
  list(@Query() query: PaginationQueryDto): Promise<PaginatedResponseDto<SupplierResponseDto>> {
    return this.listSuppliersUseCase.execute(query);
  }

  @RequirePermission('suppliers', 'create')
  @Post()
  create(@Body() dto: CreateSupplierDto): Promise<SupplierResponseDto> {
    return this.createSupplierUseCase.execute(dto);
  }

  @RequirePermission('suppliers', 'update')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSupplierDto): Promise<SupplierResponseDto> {
    return this.updateSupplierUseCase.execute(id, dto);
  }
}
