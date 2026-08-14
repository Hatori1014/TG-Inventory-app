import { AuthUser } from './auth-user.entity';

// Port (ADR-03/convenciones.md) — implemented by
// infrastructure/user.prisma.repository.ts.
export const AUTH_USER_REPOSITORY = Symbol('AUTH_USER_REPOSITORY');

export interface AuthUserRepository {
  findByEmail(email: string): Promise<AuthUser | null>;
}
