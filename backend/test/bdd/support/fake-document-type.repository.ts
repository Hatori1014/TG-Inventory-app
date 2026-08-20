import { randomUUID } from 'crypto';
import { DocumentType, DocumentTypeStatus } from '@prisma/client';

// In-memory stand-in for DocumentTypePrismaRepository — never touches
// Postgres (CI has no database service). Same shape as FakeUnitRepository.
export class FakeDocumentTypeRepository {
  private readonly documentTypes = new Map<string, DocumentType>();

  seed(name: string, status: DocumentTypeStatus = 'active'): DocumentType {
    const documentType: DocumentType = { id: randomUUID(), name, status };
    this.documentTypes.set(documentType.id, documentType);
    return documentType;
  }

  async findAllPaginated(skip: number, take: number): Promise<{ items: DocumentType[]; total: number }> {
    const all = [...this.documentTypes.values()];
    return { items: all.slice(skip, skip + take), total: all.length };
  }

  async findById(id: string): Promise<DocumentType | null> {
    return this.documentTypes.get(id) ?? null;
  }

  async create(name: string): Promise<DocumentType> {
    const duplicate = [...this.documentTypes.values()].some((d) => d.name === name);
    if (duplicate) {
      throw { code: 'P2002' };
    }
    return this.seed(name);
  }

  async update(id: string, data: { name?: string; status?: DocumentTypeStatus }): Promise<DocumentType> {
    const existing = this.documentTypes.get(id);
    if (!existing) {
      throw new Error(`DocumentType ${id} not found`);
    }
    if (data.name && data.name !== existing.name) {
      const duplicate = [...this.documentTypes.values()].some((d) => d.name === data.name);
      if (duplicate) {
        throw { code: 'P2002' };
      }
    }
    const updated: DocumentType = { ...existing, ...data };
    this.documentTypes.set(id, updated);
    return updated;
  }
}
