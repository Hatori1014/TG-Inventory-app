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
}
