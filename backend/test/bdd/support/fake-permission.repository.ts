import { randomUUID } from 'crypto';
import { Permission } from '../../../src/modules/roles/domain/permission.value-object';
import { PermissionRepository } from '../../../src/modules/roles/domain/permission.repository.interface';

// In-memory stand-in for PermissionPrismaRepository — never touches
// Postgres (CI has no database service).
export class FakePermissionRepository implements PermissionRepository {
  private readonly permissions = new Map<string, Permission>();

  seed(module: string, action: string): Permission {
    const permission = new Permission(module, action, randomUUID());
    this.permissions.set(permission.getId() as string, permission);
    return permission;
  }

  async findAllPaginated(
    skip: number,
    take: number,
  ): Promise<{ items: Permission[]; total: number }> {
    const all = [...this.permissions.values()];
    return { items: all.slice(skip, skip + take), total: all.length };
  }

  async findManyByIds(ids: string[]): Promise<Permission[]> {
    return ids
      .map((id) => this.permissions.get(id))
      .filter((permission): permission is Permission => permission !== undefined);
  }
}
