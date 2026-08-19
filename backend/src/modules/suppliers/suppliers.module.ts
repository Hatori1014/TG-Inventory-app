import { Module } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { SuppliersController } from './suppliers.controller';
import { CreateSupplierUseCase } from './application/use-cases/create-supplier.use-case';
import { ListSuppliersUseCase } from './application/use-cases/list-suppliers.use-case';
import { UpdateSupplierUseCase } from './application/use-cases/update-supplier.use-case';
import { SupplierPrismaRepository } from './infrastructure/supplier.prisma.repository';

// No APP_GUARD registered here — PermissionsGuard is already global via
// RolesModule; this module only uses @RequirePermission() on its endpoints.
@Module({
  controllers: [SuppliersController],
  providers: [
    PrismaService,
    CreateSupplierUseCase,
    ListSuppliersUseCase,
    UpdateSupplierUseCase,
    SupplierPrismaRepository,
  ],
})
export class SuppliersModule {}
