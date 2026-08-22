import { Module } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UsersController } from './users.controller';
import { CreateUserUseCase } from './application/use-cases/create-user.use-case';
import { ListUsersUseCase } from './application/use-cases/list-users.use-case';
import { UpdateUserUseCase } from './application/use-cases/update-user.use-case';
import { ValidateUserCredentialsUseCase } from './application/use-cases/validate-user-credentials.use-case';
import { ReassignUsersRoleUseCase } from './application/use-cases/reassign-users-role.use-case';
import { USER_REPOSITORY } from './domain/user.repository.interface';
import { UserPrismaRepository } from './infrastructure/user.prisma.repository';

@Module({
  controllers: [UsersController],
  providers: [
    PrismaService,
    CreateUserUseCase,
    ListUsersUseCase,
    UpdateUserUseCase,
    ValidateUserCredentialsUseCase,
    ReassignUsersRoleUseCase,
    { provide: USER_REPOSITORY, useClass: UserPrismaRepository },
  ],
  // ADR-26 — AuthModule consumes this to validate login credentials,
  // without ever seeing the User entity or its passwordHash. USER_REPOSITORY
  // itself is never exported — only auth's own module may see the raw hash.
  // ReassignUsersRoleUseCase is exported for the same reason: RolesModule
  // needs to move users off a role being deleted without importing this
  // module's domain/infrastructure directly (ADR-18).
  exports: [ValidateUserCredentialsUseCase, ReassignUsersRoleUseCase],
})
export class UsersModule {}
