import { randomUUID } from 'crypto';
import { Location, LocationStatus } from '@prisma/client';

// In-memory stand-in for LocationPrismaRepository — never touches Postgres
// (CI has no database service). No interface to implement (the real
// repository has no domain/ port either, convenciones.md's trivial-CRUD
// carve-out), just a structurally-matching class.
export class FakeLocationRepository {
  private readonly locations = new Map<string, Location>();

  seed(name: string, parentId: string | null = null, status: LocationStatus = 'active'): Location {
    const location: Location = { id: randomUUID(), name, parentId, status };
    this.locations.set(location.id, location);
    return location;
  }

  async findAllPaginated(skip: number, take: number): Promise<{ items: Location[]; total: number }> {
    const all = [...this.locations.values()];
    return { items: all.slice(skip, skip + take), total: all.length };
  }

  async findById(id: string): Promise<Location | null> {
    return this.locations.get(id) ?? null;
  }

  async findByParentAndName(parentId: string | null, name: string): Promise<Location | null> {
    return [...this.locations.values()].find((l) => l.parentId === parentId && l.name === name) ?? null;
  }

  async create(data: { name: string; parentId?: string }): Promise<Location> {
    if (data.parentId && !this.locations.has(data.parentId)) {
      throw { code: 'P2003' };
    }
    return this.seed(data.name, data.parentId ?? null);
  }

  async update(
    id: string,
    data: { name?: string; parentId?: string; status?: LocationStatus },
  ): Promise<Location> {
    const existing = this.locations.get(id);
    if (!existing) {
      throw new Error(`Location ${id} not found`);
    }
    if (data.parentId && !this.locations.has(data.parentId)) {
      throw { code: 'P2003' };
    }
    const updated: Location = { ...existing, ...data };
    this.locations.set(id, updated);
    return updated;
  }
}
