import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { GetProductPriceComparisonUseCase } from './application/use-cases/get-product-price-comparison.use-case';
import { GetSupplierPriceComparisonUseCase } from './application/use-cases/get-supplier-price-comparison.use-case';
import { ProductPriceComparisonQueryDto } from './dto/product-price-comparison-query.dto';
import { SupplierPriceComparisonQueryDto } from './dto/supplier-price-comparison-query.dto';
import { ProductPriceComparisonResponseDto } from './dto/product-price-comparison-response.dto';
import { SupplierPriceComparisonResponseDto } from './dto/supplier-price-comparison-response.dto';

// HU-14 — "Comparativa de precios de compra" (plan section 7.4 names
// GET /reports/price-comparison for view 1; view 2 is a sibling route
// under the same prefix, added at the user's explicit request after the
// plan was written). Lives in the purchases module, not a new reports/
// module, for the same reason SupplierPurchaseHistoryController does
// (HU-05): the capability it wraps belongs to PurchasePrismaRepository,
// and gating on 'purchases':'read' avoids seeding a permission nobody else
// uses for one read-only report.
@ApiTags('reports')
@Controller('reports')
export class PriceComparisonController {
  constructor(
    private readonly getProductPriceComparisonUseCase: GetProductPriceComparisonUseCase,
    private readonly getSupplierPriceComparisonUseCase: GetSupplierPriceComparisonUseCase,
  ) {}

  @RequirePermission('purchases', 'read')
  @Get('price-comparison')
  byProduct(@Query() query: ProductPriceComparisonQueryDto): Promise<ProductPriceComparisonResponseDto> {
    return this.getProductPriceComparisonUseCase.execute(query.productId);
  }

  @RequirePermission('purchases', 'read')
  @Get('supplier-price-comparison')
  bySuppliers(@Query() query: SupplierPriceComparisonQueryDto): Promise<SupplierPriceComparisonResponseDto> {
    return this.getSupplierPriceComparisonUseCase.execute(query.supplierIds);
  }
}
