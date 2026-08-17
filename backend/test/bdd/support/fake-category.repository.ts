import { randomUUID } from 'crypto';
import { Category, CategoryStatus } from '@prisma/client';

// In-memory stand-in for CategoryPrismaRepository — never touches Postgres
// (CI has no database service). No interface to implement (the real
// repository has no domain/ port either, convenciones.md's trivial-CRUD
// carve-out), just a structurally-matching class.
export class FakeCategoryRepository {
  private readonly categories = new Map<string, Category>();

  seed(name: string, status: CategoryStatus = 'active'): Category {
    const category: Category = { id: randomUUID(), name, status };
    this.categories.set(category.id, category);
    return category;
  }

  async findAllPaginated(skip: number, take: number): Promise<{ items: Category[]; total: number }> {
    const all = [...this.categories.values()];
    return { items: all.slice(skip, skip + take), total: all.length };
  }

  async findById(id: string): Promise<Category | null> {
    return this.categories.get(id) ?? null;
  }

  async create(name: string): Promise<Category> {
    const duplicate = [...this.categories.values()].some((c) => c.name === name);
    if (duplicate) {
      throw { code: 'P2002' };
    }
    return this.seed(name);
  }

  async update(id: string, data: { name?: string; status?: CategoryStatus }): Promise<Category> {
    const existing = this.categories.get(id);
    if (!existing) {
      throw new Error(`Category ${id} not found`);
    }
    if (data.name && data.name !== existing.name) {
      const duplicate = [...this.categories.values()].some((c) => c.name === data.name);
      if (duplicate) {
        throw { code: 'P2002' };
      }
    }
    const updated: Category = { ...existing, ...data };
    this.categories.set(id, updated);
    return updated;
  }
}
