// Distinct from user.model.ts (HU-01's authenticated-session model) — this is
// the admin-facing user management model (HU-03).
export type UserStatus = 'active' | 'blocked';

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: { id: string; name: string };
  status: UserStatus;
}

export interface CreateUserAccountRequest {
  name: string;
  email: string;
  password: string;
  roleId: string;
}

export interface UpdateUserAccountRequest {
  name?: string;
  email?: string;
  roleId?: string;
  status?: UserStatus;
}
