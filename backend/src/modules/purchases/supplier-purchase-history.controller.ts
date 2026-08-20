import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { GetSupplierPurchaseHistoryUseCase } from './application/use-cases/get-supplier-purchase-history.use-case';
import { PurchaseResponseDto } from './dto/purchase-response.dto';

// HU-05 — plan section 7.4 gives this its own URL, GET /suppliers/:id/purchases,
// distinct from HU-13's GET /purchases. Lives in the purchases module (not
// suppliers/) because the capability it wraps — GetSupplierPurchaseHistoryUseCase,
// PurchasePrismaRepository — belongs there; a separate controller class with
// its own @Controller('suppliers') prefix is how NestJS lets one module own
// a route under another feature's URL segment without crossing ADR-18's
// module boundaries in either direction.
@ApiTags('suppliers')
@Controller('suppliers')
export class SupplierPurchaseHistoryController {
  constructor(private readonly getSupplierPurchaseHistoryUseCase: GetSupplierPurchaseHistoryUseCase) {}

  @RequirePermission('purchases', 'read')
  @Get(':id/purchases')
  history(
    @Param('id') id: string,
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<PurchaseResponseDto>> {
    return this.getSupplierPurchaseHistoryUseCase.execute(id, query);
  }
}
