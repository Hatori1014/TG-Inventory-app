import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { LogoutUseCase } from './application/use-cases/logout.use-case';
import { JwtStrategy } from './infrastructure/jwt.strategy';
import { UsersModule } from '../users/users.module';
import { AuditModule } from '../audit/audit.module';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PrismaService } from '../../database/prisma.service';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: config.get<string>('JWT_EXPIRES_IN') },
      }),
    }),
    // HU-03/ADR-26 — auth no longer owns a User repository; it consumes
    // UsersModule's exported ValidateUserCredentialsUseCase.
    UsersModule,
    // HU-23 — LoginUseCase audits both successful and failed logins via
    // AuditModule's exported RecordAuditEventUseCase (ADR-18 cross-module DI).
    AuditModule,
  ],
  controllers: [AuthController],
  providers: [
    PrismaService,
    LoginUseCase,
    LogoutUseCase,
    JwtStrategy,
    // ADR-24 — global by default: any new endpoint requires a valid JWT
    // (and the role it declares via @Roles()) unless marked @Public().
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AuthModule {}
