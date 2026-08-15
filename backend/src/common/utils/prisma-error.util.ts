function hasPrismaErrorCode(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === code
  );
}

// Shared detection for Postgres' unique-constraint violation surfaced by
// Prisma as error code P2002 — used wherever a use-case/interceptor needs to
// translate a race-lost insert into a controlled response instead of a 500.
export function isUniqueConstraintViolation(error: unknown): boolean {
  return hasPrismaErrorCode(error, 'P2002');
}

// Foreign-key violation (e.g. a roleId that doesn't exist) surfaced by
// Prisma as error code P2003 — translated into a controlled 400 instead of
// letting it fall through to GlobalExceptionFilter's generic 500.
export function isForeignKeyViolation(error: unknown): boolean {
  return hasPrismaErrorCode(error, 'P2003');
}
