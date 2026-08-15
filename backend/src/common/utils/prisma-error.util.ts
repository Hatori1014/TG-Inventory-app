// Shared detection for Postgres' unique-constraint violation surfaced by
// Prisma as error code P2002 — used wherever a use-case/interceptor needs to
// translate a race-lost insert into a controlled response instead of a 500.
export function isUniqueConstraintViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'P2002'
  );
}
