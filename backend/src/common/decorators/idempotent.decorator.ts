import { SetMetadata } from '@nestjs/common';

export const IDEMPOTENT_KEY = 'idempotent';

// Marks a write endpoint as requiring an Idempotency-Key header, enforced by
// IdempotencyInterceptor (see ADR-21). Usage: @Idempotent() alongside
// @UseInterceptors(IdempotencyInterceptor) on the controller method.
export const Idempotent = () => SetMetadata(IDEMPOTENT_KEY, true);
