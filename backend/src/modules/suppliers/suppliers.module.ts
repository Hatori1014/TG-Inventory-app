import { Module } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { SuppliersController } from './suppliers.controller';
import { DocumentTypesController } from './document-types.controller';
import { PersonTypesController } from './person-types.controller';
import { CreateSupplierUseCase } from './application/use-cases/create-supplier.use-case';
import { ListSuppliersUseCase } from './application/use-cases/list-suppliers.use-case';
import { UpdateSupplierUseCase } from './application/use-cases/update-supplier.use-case';
import { CreateDocumentTypeUseCase } from './application/use-cases/create-document-type.use-case';
import { ListDocumentTypesUseCase } from './application/use-cases/list-document-types.use-case';
import { UpdateDocumentTypeUseCase } from './application/use-cases/update-document-type.use-case';
import { CreatePersonTypeUseCase } from './application/use-cases/create-person-type.use-case';
import { ListPersonTypesUseCase } from './application/use-cases/list-person-types.use-case';
import { UpdatePersonTypeUseCase } from './application/use-cases/update-person-type.use-case';
import { SupplierPrismaRepository } from './infrastructure/supplier.prisma.repository';
import { DocumentTypePrismaRepository } from './infrastructure/document-type.prisma.repository';
import { PersonTypePrismaRepository } from './infrastructure/person-type.prisma.repository';

// Groups Supplier with its two support catalogs (DocumentType, PersonType)
// — same grouping criterion as the products module bundling
// ProductsController+CategoriesController+UnitsController (HU-28). No
// APP_GUARD registered here — PermissionsGuard is already global via
// RolesModule; this module only uses @RequirePermission() on its endpoints.
@Module({
  controllers: [SuppliersController, DocumentTypesController, PersonTypesController],
  providers: [
    PrismaService,
    CreateSupplierUseCase,
    ListSuppliersUseCase,
    UpdateSupplierUseCase,
    CreateDocumentTypeUseCase,
    ListDocumentTypesUseCase,
    UpdateDocumentTypeUseCase,
    CreatePersonTypeUseCase,
    ListPersonTypesUseCase,
    UpdatePersonTypeUseCase,
    SupplierPrismaRepository,
    DocumentTypePrismaRepository,
    PersonTypePrismaRepository,
  ],
})
export class SuppliersModule {}
