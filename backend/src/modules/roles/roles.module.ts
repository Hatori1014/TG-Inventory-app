import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PrismaService } from '../../database/prisma.service';
import { UsersModule } from '../users/users.module';
import { AuditModule } from '../audit/audit.module';
import { RolesController } from './roles.controller';
import { PermissionsController } from './permissions.controller';
import { CreateRoleUseCase } from './application/use-cases/create-role.use-case';
import { ListRolesUseCase } from './application/use-cases/list-roles.use-case';
import { UpdateRolePermissionsUseCase } from './application/use-cases/update-role-permissions.use-case';
import { DeleteRoleUseCase } from './application/use-cases/delete-role.use-case';
import { ListPermissionsUseCase } from './application/use-cases/list-permissions.use-case';
import { ROLE_REPOSITORY } from './domain/role.repository.interface';
import { PERMISSION_REPOSITORY } from './domain/permission.repository.interface';
import { RolePrismaRepository } from './infrastructure/role.prisma.repository';
import { PermissionPrismaRepository } from './infrastructure/permission.prisma.repository';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

// Default-role feature — imports UsersModule to reuse its exported
// ReassignUsersRoleUseCase from DeleteRoleUseCase (ADR-18 cross-module DI,
// same pattern HU-17 used for PurchasesModule/RequestsModule). No
// circularity: UsersModule never imports RolesModule (it validates roleId
// via a P2003 catch instead, ADR-18/HU-03).
// HU-23 — imports AuditModule so create/delete/update-permissions can
// audit who changed a role.
@Module({
  imports: [UsersModule, AuditModule],
  controllers: [RolesController, PermissionsController],
  providers: [
    PrismaService,
    CreateRoleUseCase,
    ListRolesUseCase,
    UpdateRolePermissionsUseCase,
    DeleteRoleUseCase,
    ListPermissionsUseCase,
    { provide: ROLE_REPOSITORY, useClass: RolePrismaRepository },
    { provide: PERMISSION_REPOSITORY, useClass: PermissionPrismaRepository },
    // ADR-25 — global by default: any endpoint marked @RequirePermission()
    // is denied unless the caller's role has that module+action granted.
    // The module that owns the permissions concept activates its own guard
    // globally (same pattern as AuthModule with JwtAuthGuard/RolesGuard).
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class RolesModule {}
