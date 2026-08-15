import { randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';
import { User, UserStatus } from '../../../src/modules/users/domain/user.entity';
import {
  CreateUserData,
  UpdateUserData,
  UserRepository,
} from '../../../src/modules/users/domain/user.repository.interface';

// In-memory stand-in for UserPrismaRepository, shared across BDD suites that
// need a real login (via a real JWT) without touching Postgres (CI has no
// database service). create()/update() simulate the real Postgres
// constraints (P2002 duplicate email, P2003 unknown roleId) that
// CreateUserUseCase/UpdateUserUseCase detect by Prisma error code — kept
// isolated from FakeRoleRepository, same module boundary as production code
// (users never imports roles/domain), so valid role ids must be registered
// explicitly via registerRole().
export class FakeUserRepository implements UserRepository {
  private readonly usersByEmail = new Map<string, User>();
  private readonly usersById = new Map<string, User>();
  private readonly knownRoleNames = new Map<string, string>();

  seed(email: string, password: string, roleName: string, status: UserStatus = 'active'): User {
    const passwordHash = bcrypt.hashSync(password, 4);
    const roleId = this.roleIdForName(roleName);
    const user = new User(randomUUID(), 'Test User', email, passwordHash, roleId, roleName, status);
    this.usersByEmail.set(email, user);
    this.usersById.set(user.getId(), user);
    return user;
  }

  registerRole(roleId: string, roleName: string): void {
    this.knownRoleNames.set(roleId, roleName);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersByEmail.get(email) ?? null;
  }

  async findById(id: string): Promise<User | null> {
    return this.usersById.get(id) ?? null;
  }

  async findAllPaginated(skip: number, take: number): Promise<{ items: User[]; total: number }> {
    const all = [...this.usersById.values()];
    return { items: all.slice(skip, skip + take), total: all.length };
  }

  async create(data: CreateUserData): Promise<User> {
    if (this.usersByEmail.has(data.email)) {
      throw { code: 'P2002' };
    }
    const roleName = this.knownRoleNames.get(data.roleId);
    if (!roleName) {
      throw { code: 'P2003' };
    }
    const user = new User(randomUUID(), data.name, data.email, data.passwordHash, data.roleId, roleName, 'active');
    this.usersByEmail.set(user.getEmail(), user);
    this.usersById.set(user.getId(), user);
    return user;
  }

  async update(id: string, data: UpdateUserData): Promise<User> {
    const existing = this.usersById.get(id);
    if (!existing) {
      throw new Error(`User ${id} not found`);
    }
    if (data.email && data.email !== existing.getEmail() && this.usersByEmail.has(data.email)) {
      throw { code: 'P2002' };
    }
    let roleId = existing.getRoleId();
    let roleName = existing.getRoleName();
    if (data.roleId) {
      const foundRoleName = this.knownRoleNames.get(data.roleId);
      if (!foundRoleName) {
        throw { code: 'P2003' };
      }
      roleId = data.roleId;
      roleName = foundRoleName;
    }

    const updated = new User(
      existing.getId(),
      data.name ?? existing.getName(),
      data.email ?? existing.getEmail(),
      existing.getPasswordHash(),
      roleId,
      roleName,
      data.status ?? existing.getStatus(),
    );

    if (data.email && data.email !== existing.getEmail()) {
      this.usersByEmail.delete(existing.getEmail());
    }
    this.usersByEmail.set(updated.getEmail(), updated);
    this.usersById.set(updated.getId(), updated);
    return updated;
  }

  private roleIdForName(roleName: string): string {
    for (const [roleId, name] of this.knownRoleNames.entries()) {
      if (name === roleName) return roleId;
    }
    const roleId = randomUUID();
    this.knownRoleNames.set(roleId, roleName);
    return roleId;
  }
}
