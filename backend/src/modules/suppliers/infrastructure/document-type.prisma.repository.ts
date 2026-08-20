import { Injectable } from '@nestjs/common';
import { DocumentType, DocumentTypeStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';

// No domain/ layer — trivial CRUD (convenciones.md). Injected directly by
// class, no repository interface/Symbol port. Same shape as
// UnitPrismaRepository/CategoryPrismaRepository (TT-23).
@Injectable()
export class DocumentTypePrismaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAllPaginated(skip: number, take: number): Promise<{ items: DocumentType[]; total: number }> {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.documentType.findMany({ skip, take, orderBy: { name: 'asc' } }),
      this.prisma.documentType.count(),
    ]);
    return { items, total };
  }

  async findById(id: string): Promise<DocumentType | null> {
    return this.prisma.documentType.findUnique({ where: { id } });
  }

  async create(name: string): Promise<DocumentType> {
    return this.prisma.documentType.create({ data: { name } });
  }

  async update(id: string, data: { name?: string; status?: DocumentTypeStatus }): Promise<DocumentType> {
    return this.prisma.documentType.update({ where: { id }, data });
  }
}
