import { Permission } from './permission.value-object';

// Port (ADR-03/convenciones.md) — implemented by
// infrastructure/permission.prisma.repository.ts.
export const PERMISSION_REPOSITORY = Symbol('PERMISSION_REPOSITORY');

export interface PermissionRepository {
  findAllPaginated(skip: number, take: number): Promise<{ items: Permission[]; total: number }>;
  findManyByIds(ids: string[]): Promise<Permission[]>;
}
