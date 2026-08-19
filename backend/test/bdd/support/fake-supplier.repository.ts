import { randomUUID } from 'crypto';
import { SupplierStatus } from '@prisma/client';
import { FakeDocumentTypeRepository } from './fake-document-type.repository';
import { FakePersonTypeRepository } from './fake-person-type.repository';
import { SupplierWithRelations } from '../../../src/modules/suppliers/application/supplier-response.mapper';
import {
  CreateSupplierData,
  UpdateSupplierData,
} from '../../../src/modules/suppliers/infrastructure/supplier.prisma.repository';

// In-memory stand-in for SupplierPrismaRepository — never touches Postgres
// (CI has no database service). Depends on FakeDocumentTypeRepository/
// FakePersonTypeRepository to resolve documentTypeId/personTypeId into the
// joined objects the real repository's `include` would return — same
// pattern as FakeProductRepository (unit/category).
export class FakeSupplierRepository {
  private readonly suppliers = new Map<string, SupplierWithRelations>();

  constructor(
    private readonly documentTypeRepository: FakeDocumentTypeRepository,
    private readonly personTypeRepository: FakePersonTypeRepository,
  ) {}

  seed(
    name: string,
    taxId: string | null = null,
    status: SupplierStatus = 'active',
    documentTypeId: string | null = null,
  ): SupplierWithRelations {
    const supplier: SupplierWithRelations = {
      id: randomUUID(),
      name,
      taxId,
      documentTypeId,
      documentType: null,
      personTypeId: null,
      personType: null,
      contact: null,
      phone: null,
      email: null,
      status,
    };
    this.suppliers.set(supplier.id, supplier);
    return supplier;
  }

  async findAllPaginated(skip: number, take: number): Promise<{ items: SupplierWithRelations[]; total: number }> {
    const all = [...this.suppliers.values()];
    return { items: all.slice(skip, skip + take), total: all.length };
  }

  async findById(id: string): Promise<SupplierWithRelations | null> {
    return this.suppliers.get(id) ?? null;
  }

  async findActiveByTaxId(taxId: string, documentTypeId?: string): Promise<SupplierWithRelations | null> {
    const effectiveDocumentTypeId = documentTypeId ?? null;
    return (
      [...this.suppliers.values()].find(
        (s) => s.taxId === taxId && s.documentTypeId === effectiveDocumentTypeId && s.status === 'active',
      ) ?? null
    );
  }

  async create(data: CreateSupplierData): Promise<SupplierWithRelations> {
    const documentType = data.documentTypeId
      ? await this.documentTypeRepository.findById(data.documentTypeId)
      : null;
    if (data.documentTypeId && !documentType) {
      throw { code: 'P2003' };
    }
    const personType = data.personTypeId ? await this.personTypeRepository.findById(data.personTypeId) : null;
    if (data.personTypeId && !personType) {
      throw { code: 'P2003' };
    }

    const supplier: SupplierWithRelations = {
      id: randomUUID(),
      name: data.name,
      taxId: data.taxId ?? null,
      documentTypeId: data.documentTypeId ?? null,
      documentType,
      personTypeId: data.personTypeId ?? null,
      personType,
      contact: data.contact ?? null,
      phone: data.phone ?? null,
      email: data.email ?? null,
      status: 'active',
    };
    this.suppliers.set(supplier.id, supplier);
    return supplier;
  }

  async update(id: string, data: UpdateSupplierData): Promise<SupplierWithRelations> {
    const existing = this.suppliers.get(id);
    if (!existing) {
      throw new Error(`Supplier ${id} not found`);
    }

    let documentType = existing.documentType;
    let documentTypeId = existing.documentTypeId;
    if (data.documentTypeId) {
      const found = await this.documentTypeRepository.findById(data.documentTypeId);
      if (!found) {
        throw { code: 'P2003' };
      }
      documentType = found;
      documentTypeId = data.documentTypeId;
    }

    let personType = existing.personType;
    let personTypeId = existing.personTypeId;
    if (data.personTypeId) {
      const found = await this.personTypeRepository.findById(data.personTypeId);
      if (!found) {
        throw { code: 'P2003' };
      }
      personType = found;
      personTypeId = data.personTypeId;
    }

    const updated: SupplierWithRelations = {
      ...existing,
      name: data.name ?? existing.name,
      taxId: data.taxId ?? existing.taxId,
      documentTypeId,
      documentType,
      personTypeId,
      personType,
      contact: data.contact ?? existing.contact,
      phone: data.phone ?? existing.phone,
      email: data.email ?? existing.email,
      status: data.status ?? existing.status,
    };
    this.suppliers.set(id, updated);
    return updated;
  }
}
