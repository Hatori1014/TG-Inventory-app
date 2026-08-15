import { randomUUID } from 'crypto';
import { Role } from '../../../src/modules/roles/domain/role.entity';
import { Permission } from '../../../src/modules/roles/domain/permission.value-object';
import { RoleRepository } from '../../../src/modules/roles/domain/role.repository.interface';
import { FakePermissionRepository } from './fake-permission.repository';

// In-memory stand-in for RolePrismaRepository — never touches Postgres (CI
// has no database service). Depends on FakePermissionRepository to resolve
// permissionIds back into real Permission VOs, same as the real repository
// resolves them via the `permission` table.
export class FakeRoleRepository implements RoleRepository {
  private readonly roles = new Map<string, Role>();

  constructor(private readonly permissionRepository: FakePermissionRepository) {}

  seed(name: string, permissions: Permission[] = [], description: string | null = null): Role {
    const role = new Role(randomUUID(), name, description, permissions);
    this.roles.set(role.getId(), role);
    return role;
  }

  async findAllPaginated(skip: number, take: number): Promise<{ items: Role[]; total: number }> {
    const all = [...this.roles.values()];
    return { items: all.slice(skip, skip + take), total: all.length };
  }

  async findById(id: string): Promise<Role | null> {
    return this.roles.get(id) ?? null;
  }

  async create(name: string, description?: string): Promise<Role> {
    return this.seed(name, [], description ?? null);
  }

  async replacePermissions(roleId: string, permissionIds: string[]): Promise<Role> {
    const existing = this.roles.get(roleId);
    if (!existing) {
      throw new Error(`Role ${roleId} not found`);
    }
    const newPermissions = await this.permissionRepository.findManyByIds(permissionIds);
    const updated = new Role(
      existing.getId(),
      existing.getName(),
      existing.getDescription(),
      newPermissions,
    );
    this.roles.set(roleId, updated);
    return updated;
  }
}
