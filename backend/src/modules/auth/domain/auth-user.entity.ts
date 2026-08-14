// Auth's own read-only view of a user, scoped to what login needs (ADR-17 —
// entity with behavior, not an anemic data bag). Intentionally NOT the same
// entity HU-02/03's `users` module will own — that module doesn't exist yet;
// once it does, auth should be refactored to consume its exported service
// instead of querying User directly via its own repository (ADR-18).
export type AuthUserStatus = 'active' | 'blocked';

export class AuthUser {
  constructor(
    private readonly id: string,
    private readonly name: string,
    private readonly email: string,
    private readonly passwordHash: string,
    private readonly roleName: string,
    private readonly status: AuthUserStatus,
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

  getRoleName(): string {
    return this.roleName;
  }
}
