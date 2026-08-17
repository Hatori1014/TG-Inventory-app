// Entity with behavior (ADR-17) — users is the real owner of this concept.
// Holds roleId/roleName as plain fields, not a Role domain object: importing
// roles/domain from here would violate ADR-18 module boundaries.
export type UserStatus = 'active' | 'blocked';

export class User {
  constructor(
    private readonly id: string,
    private readonly name: string,
    private readonly email: string,
    private readonly passwordHash: string,
    private readonly roleId: string,
    private readonly roleName: string,
    private readonly status: UserStatus,
  ) {}

  isActive(): boolean {
    return this.status === 'active';
  }

  getId(): string {
    return this.id;
  }

  getName(): string {
    return this.name;
  }

  getEmail(): string {
    return this.email;
  }

  getPasswordHash(): string {
    return this.passwordHash;
  }

  getRoleId(): string {
    return this.roleId;
  }

  getRoleName(): string {
    return this.roleName;
  }

  getStatus(): UserStatus {
    return this.status;
  }
}
