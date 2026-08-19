import { Injectable } from '@nestjs/common';
import { Supplier, SupplierStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';

// No domain/ layer — Supplier is CRUD with one conditional business rule
// (convenciones.md: "CRUD triviales pueden empezar sin las 4 capas"), same
// carve-out already used by locations/products. Injected directly by
// class, no repository interface/Symbol port.
@Injectable()
export class SupplierPrismaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAllPaginated(skip: number, take: number): Promise<{ items: Supplier[]; total: number }> {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.supplier.findMany({ skip, take, orderBy: { name: 'asc' } }),
      this.prisma.supplier.count(),
    ]);
    return { items, total };
  }

  async findById(id: string): Promise<Supplier | null> {
    return this.prisma.supplier.findUnique({ where: { id } });
  }

  // HU-04: the uniqueness rule only applies among ACTIVE suppliers — an
  // inactive supplier may share a tax ID with an active one.
  async findActiveByTaxId(taxId: string): Promise<Supplier | null> {
    return this.prisma.supplier.findFirst({ where: { taxId, status: SupplierStatus.active } });
  }

  async create(data: {
    name: string;
    taxId?: string;
    contact?: string;
    phone?: string;
    email?: string;
  }): Promise<Supplier> {
    return this.prisma.supplier.create({ data });
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
    return this.prisma.supplier.update({ where: { id }, data });
  }
}
