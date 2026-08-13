import { ConflictException } from '@nestjs/common';

export interface OptimisticLockOptions {
  maxAttempts?: number;
}

const DEFAULT_MAX_ATTEMPTS = 3;

// Runs `operation` up to maxAttempts times. `operation` must return null to
// signal a version mismatch (e.g. a Prisma updateMany with a `version` filter
// that matched zero rows) — see ADR-20. Any other return value is treated as
// success and returned immediately.
export async function withOptimisticLock<T>(
  operation: () => Promise<T | null>,
  options: OptimisticLockOptions = {},
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await operation();
    if (result !== null) {
      return result;
    }
  }

  throw new ConflictException(
    'Could not complete the update: the record changed concurrently. Please retry.',
  );
}
