import { Permission } from './permission.value-object';

// Entity with behavior (ADR-17) — hasPermission() is HU-02's actual business
// rule, covered by pure TDD with no DB involved.
export class Role {
  constructor(
    private readonly id: string,
    private readonly name: string,
    private readonly description: string | null,
    private readonly permissions: Permission[],
  ) {}

  getId(): string {
    return this.id;
  }

  getName(): string {
    return this.name;
  }

  getDescription(): string | null {
    return this.description;
  }

  getPermissions(): Permission[] {
    return [...this.permissions];
  }

  hasPermission(module: string, action: string): boolean {
    return this.permissions.some((permission) => permission.matches(module, action));
  }
}
