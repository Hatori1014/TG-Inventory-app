import { Module } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ProductsController } from './products.controller';
import { CategoriesController } from './categories.controller';
import { UnitsController } from './units.controller';
import { CreateProductUseCase } from './application/use-cases/create-product.use-case';
import { ListProductsUseCase } from './application/use-cases/list-products.use-case';
import { UpdateProductUseCase } from './application/use-cases/update-product.use-case';
import { CreateCategoryUseCase } from './application/use-cases/create-category.use-case';
import { ListCategoriesUseCase } from './application/use-cases/list-categories.use-case';
import { UpdateCategoryUseCase } from './application/use-cases/update-category.use-case';
import { CreateUnitUseCase } from './application/use-cases/create-unit.use-case';
import { ListUnitsUseCase } from './application/use-cases/list-units.use-case';
import { UpdateUnitUseCase } from './application/use-cases/update-unit.use-case';
import { ProductPrismaRepository } from './infrastructure/product.prisma.repository';
import { CategoryPrismaRepository } from './infrastructure/category.prisma.repository';
import { UnitPrismaRepository } from './infrastructure/unit.prisma.repository';

// No APP_GUARD registered here — PermissionsGuard is already global via
// RolesModule; this module only uses @RequirePermission() on writes.
@Module({
  controllers: [ProductsController, CategoriesController, UnitsController],
  providers: [
    PrismaService,
    CreateProductUseCase,
    ListProductsUseCase,
    UpdateProductUseCase,
    CreateCategoryUseCase,
    ListCategoriesUseCase,
    UpdateCategoryUseCase,
    CreateUnitUseCase,
    ListUnitsUseCase,
    UpdateUnitUseCase,
    ProductPrismaRepository,
    CategoryPrismaRepository,
    UnitPrismaRepository,
  ],
})
export class ProductsModule {}
