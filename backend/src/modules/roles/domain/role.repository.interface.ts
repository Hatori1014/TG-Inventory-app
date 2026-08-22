import { Role } from './role.entity';

// Port (ADR-03/convenciones.md) — implemented by
// infrastructure/role.prisma.repository.ts.
export const ROLE_REPOSITORY = Symbol('ROLE_REPOSITORY');

export interface RoleRepository {
  findAllPaginated(skip: number, take: number): Promise<{ items: Role[]; total: number }>;
  findById(id: string): Promise<Role | null>;
  // The one role marked isDefault=true — the reassignment target when
  // another role is deleted.
  findDefault(): Promise<Role | null>;
  create(name: string, description?: string): Promise<Role>;
  // Replaces the role's full permission set atomically.
  replacePermissions(roleId: string, permissionIds: string[]): Promise<Role>;
  // ADR-22 logical deletion — sets deletedAt, never removes the row.
  softDelete(id: string): Promise<void>;
}
