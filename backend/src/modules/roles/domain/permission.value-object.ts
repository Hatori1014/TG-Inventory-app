// Value Object (ADR-17) — immutable, self-validates at construction. `id` is
// carried as an optional, read-only detail of persistence (needed to
// reference a concrete row when assigning permissions to a role) but does
// NOT participate in equality: two Permission instances are equal purely by
// value (module + action), matching the domain rule they represent.
export class Permission {
  constructor(
    private readonly module: string,
    private readonly action: string,
    private readonly id?: string,
  ) {
    if (!module?.trim()) {
      throw new Error('Permission module must not be empty');
    }
    if (!action?.trim()) {
      throw new Error('Permission action must not be empty');
    }
  }

  getId(): string | undefined {
    return this.id;
  }

  getModule(): string {
    return this.module;
  }

  getAction(): string {
    return this.action;
  }

  matches(module: string, action: string): boolean {
    return this.module === module && this.action === action;
  }

  equals(other: Permission): boolean {
    return this.matches(other.getModule(), other.getAction());
  }
}
