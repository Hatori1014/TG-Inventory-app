import { Injectable } from '@nestjs/common';
import { SupplierStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { supplierWithRelations, SupplierWithRelations } from '../application/supplier-response.mapper';

export interface CreateSupplierData {
  name: string;
  taxId?: string;
  documentTypeId?: string;
  personTypeId?: string;
  contact?: string;
  phone?: string;
  email?: string;
}

export interface UpdateSupplierData {
  name?: string;
  taxId?: string;
  documentTypeId?: string;
  personTypeId?: string;
  contact?: string;
  phone?: string;
  email?: string;
  status?: SupplierStatus;
}

// No domain/ layer — Supplier is CRUD with one conditional business rule
// (convenciones.md: "CRUD triviales pueden empezar sin las 4 capas"), same
// carve-out already used by locations/products. Injected directly by
// class, no repository interface/Symbol port.
@Injectable()
export class SupplierPrismaRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly include = supplierWithRelations.include;

  async findAllPaginated(skip: number, take: number): Promise<{ items: SupplierWithRelations[]; total: number }> {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.supplier.findMany({ skip, take, include: this.include, orderBy: { name: 'asc' } }),
      this.prisma.supplier.count(),
    ]);
    return { items, total };
  }

  async findById(id: string): Promise<SupplierWithRelations | null> {
    return this.prisma.supplier.findUnique({ where: { id }, include: this.include });
  }

  // HU-04: the uniqueness rule only applies among ACTIVE suppliers of the
  // SAME document type — a Cédula and a NIT sharing the same digits are two
  // different real-world identifiers, not a collision. documentTypeId is
  // passed through as-is (including undefined -> null) so two suppliers
  // that both omit it are compared consistently with the partial index's
  // own semantics (NULL never matches NULL in a Postgres unique index).
  async findActiveByTaxId(taxId: string, documentTypeId?: string): Promise<SupplierWithRelations | null> {
    return this.prisma.supplier.findFirst({
      where: { taxId, documentTypeId: documentTypeId ?? null, status: SupplierStatus.active },
      include: this.include,
    });
  }

  async create(data: CreateSupplierData): Promise<SupplierWithRelations> {
    return this.prisma.supplier.create({ data, include: this.include });
  }

  async update(id: string, data: UpdateSupplierData): Promise<SupplierWithRelations> {
    return this.prisma.supplier.update({ where: { id }, data, include: this.include });
  }
}
