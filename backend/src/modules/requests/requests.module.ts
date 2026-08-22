import { Module } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { IdempotencyInterceptor } from '../../common/interceptors/idempotency.interceptor';
import { PurchasesModule } from '../purchases/purchases.module';
import { RequestsController } from './requests.controller';
import { CreateRequestUseCase } from './application/use-cases/create-request.use-case';
import { UpdateRequestUseCase } from './application/use-cases/update-request.use-case';
import { SubmitRequestUseCase } from './application/use-cases/submit-request.use-case';
import { ListRequestsUseCase } from './application/use-cases/list-requests.use-case';
import { GetRequestUseCase } from './application/use-cases/get-request.use-case';
import { ApproveRequestUseCase } from './application/use-cases/approve-request.use-case';
import { RejectRequestUseCase } from './application/use-cases/reject-request.use-case';
import { IntegrateRequestUseCase } from './application/use-cases/integrate-request.use-case';
import { ListPendingApprovalRequestsUseCase } from './application/use-cases/list-pending-approval-requests.use-case';
import { ListPendingIntegrationRequestsUseCase } from './application/use-cases/list-pending-integration-requests.use-case';
import { RequestPrismaRepository } from './infrastructure/request.prisma.repository';

// No APP_GUARD registered here — PermissionsGuard is already global via
// RolesModule; this module only uses @RequirePermission() on its
// endpoints. IdempotencyInterceptor needs its own PrismaService instance
// in this module's provider list (same pattern as purchases/inventory,
// TT-18). HU-17 — imports PurchasesModule to reuse RegisterPurchaseUseCase
// (IntegrateRequestUseCase), the sanctioned cross-module DI path per
// ADR-18.
@Module({
  imports: [PurchasesModule],
  controllers: [RequestsController],
  providers: [
    PrismaService,
    IdempotencyInterceptor,
    CreateRequestUseCase,
    UpdateRequestUseCase,
    SubmitRequestUseCase,
    ListRequestsUseCase,
    GetRequestUseCase,
    ApproveRequestUseCase,
    RejectRequestUseCase,
    IntegrateRequestUseCase,
    ListPendingApprovalRequestsUseCase,
    ListPendingIntegrationRequestsUseCase,
    RequestPrismaRepository,
  ],
})
export class RequestsModule {}
