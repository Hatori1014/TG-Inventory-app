import { Module } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { IdempotencyInterceptor } from '../../common/interceptors/idempotency.interceptor';
import { PurchasesController } from './purchases.controller';
import { SupplierPurchaseHistoryController } from './supplier-purchase-history.controller';
import { PriceComparisonController } from './price-comparison.controller';
import { RegisterPurchaseUseCase } from './application/use-cases/register-purchase.use-case';
import { ListPurchasesUseCase } from './application/use-cases/list-purchases.use-case';
import { GetPurchaseUseCase } from './application/use-cases/get-purchase.use-case';
import { GetSupplierPurchaseHistoryUseCase } from './application/use-cases/get-supplier-purchase-history.use-case';
import { GetProductPriceComparisonUseCase } from './application/use-cases/get-product-price-comparison.use-case';
import { GetSupplierPriceComparisonUseCase } from './application/use-cases/get-supplier-price-comparison.use-case';
import { PurchasePrismaRepository } from './infrastructure/purchase.prisma.repository';

// No APP_GUARD registered here — PermissionsGuard is already global via
// RolesModule; this module only uses @RequirePermission() on its
// endpoints. IdempotencyInterceptor needs its own PrismaService instance in
// this module's provider list (same pattern as inventory.module.ts, TT-18).
// SupplierPurchaseHistoryController (HU-05) and PriceComparisonController
// (HU-14) live here, not in suppliers.module.ts, even though their routes
// are under /suppliers and /reports — see the comment on each controller.
@Module({
  controllers: [PurchasesController, SupplierPurchaseHistoryController, PriceComparisonController],
  providers: [
    PrismaService,
    IdempotencyInterceptor,
    RegisterPurchaseUseCase,
    ListPurchasesUseCase,
    GetPurchaseUseCase,
    GetSupplierPurchaseHistoryUseCase,
    GetProductPriceComparisonUseCase,
    GetSupplierPriceComparisonUseCase,
    PurchasePrismaRepository,
  ],
})
export class PurchasesModule {}
