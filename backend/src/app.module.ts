import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { validateEnv } from './config/env.validation';
import { loggerConfig } from './config/logger.config';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { RolesModule } from './modules/roles/roles.module';
import { UsersModule } from './modules/users/users.module';
import { ProductsModule } from './modules/products/products.module';
import { LocationsModule } from './modules/locations/locations.module';
// As iterations progress (plan section 6), each new business module
// (suppliers, inventory, purchases,
// requests, audit) gets imported here.

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    // TT-21 — structured logging; replaces Nest's default console logger
    // app-wide once main.ts calls app.useLogger(app.get(Logger))
    LoggerModule.forRoot(loggerConfig),
    // HU-20 — base rate limiting; tightened per endpoint in each module (e.g. login)
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    HealthModule,
    AuthModule,
    RolesModule,
    UsersModule,
    ProductsModule,
    LocationsModule,
  ],
  providers: [
    // TT-15 — one process shared by every module; an uncaught error in one
    // must come back as a controlled response, never propagate raw
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule {}
