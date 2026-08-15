import * as bcrypt from 'bcrypt';
import { AuthUser, AuthUserStatus } from '../../../src/modules/auth/domain/auth-user.entity';
import { AuthUserRepository } from '../../../src/modules/auth/domain/auth-user.repository.interface';

// In-memory stand-in for UserPrismaRepository, shared across BDD suites that
// need a real login (via a real JWT) without touching Postgres (CI has no
// database service).
export class FakeAuthUserRepository implements AuthUserRepository {
  private readonly users = new Map<string, AuthUser>();

  seed(email: string, password: string, role: string, status: AuthUserStatus = 'active'): void {
    const passwordHash = bcrypt.hashSync(password, 4);
    this.users.set(email, new AuthUser('fake-id', 'Test User', email, passwordHash, role, status));
  }

  async findByEmail(email: string): Promise<AuthUser | null> {
    return this.users.get(email) ?? null;
  }
}
