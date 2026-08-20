import { randomUUID } from 'crypto';
import { PersonType, PersonTypeStatus } from '@prisma/client';

// In-memory stand-in for PersonTypePrismaRepository — never touches
// Postgres (CI has no database service). Same shape as FakeUnitRepository.
export class FakePersonTypeRepository {
  private readonly personTypes = new Map<string, PersonType>();

  seed(name: string, status: PersonTypeStatus = 'active'): PersonType {
    const personType: PersonType = { id: randomUUID(), name, status };
    this.personTypes.set(personType.id, personType);
    return personType;
  }

  async findAllPaginated(skip: number, take: number): Promise<{ items: PersonType[]; total: number }> {
    const all = [...this.personTypes.values()];
    return { items: all.slice(skip, skip + take), total: all.length };
  }

  async findById(id: string): Promise<PersonType | null> {
    return this.personTypes.get(id) ?? null;
  }

  async create(name: string): Promise<PersonType> {
    const duplicate = [...this.personTypes.values()].some((p) => p.name === name);
    if (duplicate) {
      throw { code: 'P2002' };
    }
    return this.seed(name);
  }

  async update(id: string, data: { name?: string; status?: PersonTypeStatus }): Promise<PersonType> {
    const existing = this.personTypes.get(id);
    if (!existing) {
      throw new Error(`PersonType ${id} not found`);
    }
    if (data.name && data.name !== existing.name) {
      const duplicate = [...this.personTypes.values()].some((p) => p.name === data.name);
      if (duplicate) {
        throw { code: 'P2002' };
      }
    }
    const updated: PersonType = { ...existing, ...data };
    this.personTypes.set(id, updated);
    return updated;
  }
}
