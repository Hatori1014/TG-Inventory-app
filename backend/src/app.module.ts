import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { validateEnv } from './config/env.validation';
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
})
export class AppModule {}
