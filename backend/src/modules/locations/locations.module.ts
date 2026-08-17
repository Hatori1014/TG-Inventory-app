import { Module } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { LocationsController } from './locations.controller';
import { CreateLocationUseCase } from './application/use-cases/create-location.use-case';
import { ListLocationsUseCase } from './application/use-cases/list-locations.use-case';
import { UpdateLocationUseCase } from './application/use-cases/update-location.use-case';
import { LocationPrismaRepository } from './infrastructure/location.prisma.repository';

// No APP_GUARD registered here — PermissionsGuard is already global via
// RolesModule; this module only uses @RequirePermission() on its endpoints.
@Module({
  controllers: [LocationsController],
  providers: [
    PrismaService,
    CreateLocationUseCase,
    ListLocationsUseCase,
    UpdateLocationUseCase,
    LocationPrismaRepository,
  ],
})
export class LocationsModule {}
