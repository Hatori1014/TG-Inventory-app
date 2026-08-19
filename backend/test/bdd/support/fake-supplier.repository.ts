import { randomUUID } from 'crypto';
import { Supplier, SupplierStatus } from '@prisma/client';

// In-memory stand-in for SupplierPrismaRepository — never touches Postgres
// (CI has no database service). No interface to implement (the real
// repository has no domain/ port either, convenciones.md's trivial-CRUD
// carve-out), just a structurally-matching class.
export class FakeSupplierRepository {
  private readonly suppliers = new Map<string, Supplier>();

  seed(
    name: string,
    taxId: string | null = null,
    status: SupplierStatus = 'active',
  ): Supplier {
    const supplier: Supplier = {
      id: randomUUID(),
      name,
      taxId,
      contact: null,
      phone: null,
      email: null,
      status,
    };
    this.suppliers.set(supplier.id, supplier);
    return supplier;
  }

  async findAllPaginated(skip: number, take: number): Promise<{ items: Supplier[]; total: number }> {
    const all = [...this.suppliers.values()];
    return { items: all.slice(skip, skip + take), total: all.length };
  }

  async findById(id: string): Promise<Supplier | null> {
    return this.suppliers.get(id) ?? null;
  }

  async findActiveByTaxId(taxId: string): Promise<Supplier | null> {
    return [...this.suppliers.values()].find((s) => s.taxId === taxId && s.status === 'active') ?? null;
  }

  async create(data: {
    name: string;
    taxId?: string;
    contact?: string;
    phone?: string;
    email?: string;
  }): Promise<Supplier> {
    return this.seed(data.name, data.taxId ?? null);
  }

  async update(
    id: string,
    data: {
      name?: string;
      taxId?: string;
      contact?: string;
      phone?: string;
      email?: string;
      status?: SupplierStatus;
    },
  ): Promise<Supplier> {
    const existing = this.suppliers.get(id);
    if (!existing) {
      throw new Error(`Supplier ${id} not found`);
    }
    const updated: Supplier = { ...existing, ...data };
    this.suppliers.set(id, updated);
    return updated;
  }
}
