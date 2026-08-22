import { Module } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { IdempotencyInterceptor } from '../../common/interceptors/idempotency.interceptor';
import { InventoryController } from './inventory.controller';
import { BatchesController } from './batches.controller';
import { MinimumStockController } from './minimum-stock.controller';
import { AlertsController } from './alerts.controller';
import { RegisterMovementUseCase } from './application/use-cases/register-movement.use-case';
import { RegisterTransferUseCase } from './application/use-cases/register-transfer.use-case';
import { ListStockUseCase } from './application/use-cases/list-stock.use-case';
import { CreateBatchUseCase } from './application/use-cases/create-batch.use-case';
import { ListBatchesUseCase } from './application/use-cases/list-batches.use-case';
import { CreateMinimumStockUseCase } from './application/use-cases/create-minimum-stock.use-case';
import { UpdateMinimumStockUseCase } from './application/use-cases/update-minimum-stock.use-case';
import { ListMinimumStockUseCase } from './application/use-cases/list-minimum-stock.use-case';
import { ListAlertsUseCase } from './application/use-cases/list-alerts.use-case';
import { InventoryPrismaRepository } from './infrastructure/inventory.prisma.repository';
import { BatchPrismaRepository } from './infrastructure/batch.prisma.repository';
import { MinimumStockPrismaRepository } from './infrastructure/minimum-stock.prisma.repository';

// No APP_GUARD registered here — PermissionsGuard is already global via
// RolesModule; this module only uses @RequirePermission() on its write
// endpoint. IdempotencyInterceptor needs its own PrismaService instance in
// this module's provider list (same pattern as HealthModule) — first real
// consumer of TT-18 (ADR-21). MinimumStockController/AlertsController
// (HU-11/HU-12) live here alongside batches — same module, no new
// NestJS module, same reasoning as HU-09's batches joining this one
// instead of standing up its own.
@Module({
  controllers: [InventoryController, BatchesController, MinimumStockController, AlertsController],
  providers: [
    PrismaService,
    IdempotencyInterceptor,
    RegisterMovementUseCase,
    RegisterTransferUseCase,
    ListStockUseCase,
    CreateBatchUseCase,
    ListBatchesUseCase,
    CreateMinimumStockUseCase,
    UpdateMinimumStockUseCase,
    ListMinimumStockUseCase,
    ListAlertsUseCase,
    InventoryPrismaRepository,
    BatchPrismaRepository,
    MinimumStockPrismaRepository,
  ],
})
export class InventoryModule {}
