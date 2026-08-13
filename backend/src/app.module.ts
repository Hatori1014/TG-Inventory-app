import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { validateEnv } from './config/env.validation';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { HealthModule } from './modules/health/health.module';
// As iterations progress (plan section 6), each new business module
// (auth, users, suppliers, locations, products, inventory, purchases,
// requests, audit) gets imported here.

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    // HU-20 — base rate limiting; tightened per endpoint in each module (e.g. login)
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    HealthModule,
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
