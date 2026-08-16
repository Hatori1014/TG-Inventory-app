import { Module } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { IdempotencyInterceptor } from '../../common/interceptors/idempotency.interceptor';
import { InventoryController } from './inventory.controller';
import { RegisterMovementUseCase } from './application/use-cases/register-movement.use-case';
import { ListStockUseCase } from './application/use-cases/list-stock.use-case';
import { InventoryPrismaRepository } from './infrastructure/inventory.prisma.repository';

// No APP_GUARD registered here — PermissionsGuard is already global via
// RolesModule; this module only uses @RequirePermission() on its write
// endpoint. IdempotencyInterceptor needs its own PrismaService instance in
// this module's provider list (same pattern as HealthModule) — first real
// consumer of TT-18 (ADR-21).
@Module({
  controllers: [InventoryController],
  providers: [
    PrismaService,
    IdempotencyInterceptor,
    RegisterMovementUseCase,
    ListStockUseCase,
    InventoryPrismaRepository,
  ],
})
export class InventoryModule {}
