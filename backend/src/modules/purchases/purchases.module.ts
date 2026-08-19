import { Module } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { IdempotencyInterceptor } from '../../common/interceptors/idempotency.interceptor';
import { PurchasesController } from './purchases.controller';
import { RegisterPurchaseUseCase } from './application/use-cases/register-purchase.use-case';
import { ListPurchasesUseCase } from './application/use-cases/list-purchases.use-case';
import { GetPurchaseUseCase } from './application/use-cases/get-purchase.use-case';
import { PurchasePrismaRepository } from './infrastructure/purchase.prisma.repository';

// No APP_GUARD registered here — PermissionsGuard is already global via
// RolesModule; this module only uses @RequirePermission() on its
// endpoints. IdempotencyInterceptor needs its own PrismaService instance in
// this module's provider list (same pattern as inventory.module.ts, TT-18).
@Module({
  controllers: [PurchasesController],
  providers: [
    PrismaService,
    IdempotencyInterceptor,
    RegisterPurchaseUseCase,
    ListPurchasesUseCase,
    GetPurchaseUseCase,
    PurchasePrismaRepository,
  ],
})
export class PurchasesModule {}
