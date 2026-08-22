import { User, UserStatus } from './user.entity';

// Port (ADR-03/convenciones.md) — implemented by
// infrastructure/user.prisma.repository.ts.
export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export interface CreateUserData {
  name: string;
  email: string;
  passwordHash: string;
  roleId: string;
}

export interface UpdateUserData {
  name?: string;
  email?: string;
  roleId?: string;
  status?: UserStatus;
}

export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  findAllPaginated(skip: number, take: number): Promise<{ items: User[]; total: number }>;
  create(data: CreateUserData): Promise<User>;
  update(id: string, data: UpdateUserData): Promise<User>;
  // Default-role feature — moves every user off a role that's about to be
  // (logically) deleted, onto the reassignment target. Returns how many
  // rows were touched, so the caller can surface it (e.g. "3 usuarios
  // reasignados").
  reassignRole(fromRoleId: string, toRoleId: string): Promise<number>;
  // Duplicated trivial read (ADR-18) — a soft-deleted role still exists
  // for the FK constraint's purposes (isForeignKeyViolation alone would
  // let it through), so create/update need this explicit check to refuse
  // assigning a user to a role that's supposed to be gone.
  findRoleStatus(roleId: string): Promise<'active' | 'deleted' | 'not_found'>;
}
