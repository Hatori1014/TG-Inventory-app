import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { firstValueFrom, Observable, of } from 'rxjs';
import { PrismaService } from '../../database/prisma.service';
import { IDEMPOTENT_KEY } from '../decorators/idempotent.decorator';

const IDEMPOTENCY_HEADER = 'idempotency-key';

// Enforces idempotency on endpoints marked with @Idempotent() (ADR-21): a
// duplicate request carrying the same key returns the response already
// stored for it instead of re-running the handler.
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const isIdempotent = this.reflector.get<boolean>(IDEMPOTENT_KEY, context.getHandler());
    if (!isIdempotent) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const key = request.headers[IDEMPOTENCY_HEADER];

    if (!key || typeof key !== 'string') {
      throw new BadRequestException(`Missing required "${IDEMPOTENCY_HEADER}" header`);
    }

    const existing = await this.prisma.idempotencyKey.findUnique({ where: { key } });
    if (existing) {
      return of(existing.response);
    }

    const response = await firstValueFrom(next.handle());

    try {
      await this.prisma.idempotencyKey.create({
        data: { key, endpoint: request.url, response },
      });
    } catch (error) {
      if (!isUniqueConstraintViolation(error)) {
        throw error;
      }
      // Lost the race to a concurrent request with the same key — return
      // what it stored, not this handler's own (possibly duplicate) result.
      const winner = await this.prisma.idempotencyKey.findUnique({ where: { key } });
      if (winner) {
        return of(winner.response);
      }
    }

    return of(response);
  }
}

function isUniqueConstraintViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'P2002'
  );
}
