import { randomUUID } from 'crypto';
import { Unit, UnitStatus } from '@prisma/client';

// In-memory stand-in for UnitPrismaRepository — never touches Postgres (CI
// has no database service).
export class FakeUnitRepository {
  private readonly units = new Map<string, Unit>();

  seed(name: string, status: UnitStatus = 'active'): Unit {
    const unit: Unit = { id: randomUUID(), name, status };
    this.units.set(unit.id, unit);
    return unit;
  }

  async findAllPaginated(skip: number, take: number): Promise<{ items: Unit[]; total: number }> {
    const all = [...this.units.values()];
    return { items: all.slice(skip, skip + take), total: all.length };
  }

  async findById(id: string): Promise<Unit | null> {
    return this.units.get(id) ?? null;
  }

  async create(name: string): Promise<Unit> {
    const duplicate = [...this.units.values()].some((u) => u.name === name);
    if (duplicate) {
      throw { code: 'P2002' };
    }
    return this.seed(name);
  }

  async update(id: string, data: { name?: string; status?: UnitStatus }): Promise<Unit> {
    const existing = this.units.get(id);
    if (!existing) {
      throw new Error(`Unit ${id} not found`);
    }
    if (data.name && data.name !== existing.name) {
      const duplicate = [...this.units.values()].some((u) => u.name === data.name);
      if (duplicate) {
        throw { code: 'P2002' };
      }
    }
    const updated: Unit = { ...existing, ...data };
    this.units.set(id, updated);
    return updated;
  }
}
