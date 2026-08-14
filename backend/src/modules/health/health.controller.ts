import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../database/prisma.service';
import { Public } from '../../common/decorators/public.decorator';

// TT-11 — used to verify a deploy succeeded and for basic uptime monitoring
// (checked by Render/Fly.io and by the CD pipeline).
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  // Public (ADR-24) — JwtAuthGuard is global as of HU-01; Render/CD must be
  // able to hit this with no token.
  @Public()
  @Get()
  async check() {
    let db: 'ok' | 'error' = 'ok';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      db = 'error';
    }
    return {
      status: db === 'ok' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      database: db,
    };
  }
}
