import { Module } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { IdempotencyInterceptor } from '../../common/interceptors/idempotency.interceptor';
import { RequestsController } from './requests.controller';
import { CreateRequestUseCase } from './application/use-cases/create-request.use-case';
import { UpdateRequestUseCase } from './application/use-cases/update-request.use-case';
import { SubmitRequestUseCase } from './application/use-cases/submit-request.use-case';
import { ListRequestsUseCase } from './application/use-cases/list-requests.use-case';
import { GetRequestUseCase } from './application/use-cases/get-request.use-case';
import { RequestPrismaRepository } from './infrastructure/request.prisma.repository';

// No APP_GUARD registered here — PermissionsGuard is already global via
// RolesModule; this module only uses @RequirePermission() on its
// endpoints. IdempotencyInterceptor needs its own PrismaService instance
// in this module's provider list (same pattern as purchases/inventory,
// TT-18).
@Module({
  controllers: [RequestsController],
  providers: [
    PrismaService,
    IdempotencyInterceptor,
    CreateRequestUseCase,
    UpdateRequestUseCase,
    SubmitRequestUseCase,
    ListRequestsUseCase,
    GetRequestUseCase,
    RequestPrismaRepository,
  ],
})
export class RequestsModule {}
