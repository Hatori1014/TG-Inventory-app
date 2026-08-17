import { Injectable } from '@nestjs/common';
import { Unit, UnitStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';

// No domain/ layer — Unit is trivial CRUD (convenciones.md: "CRUD triviales
// pueden empezar sin las 4 capas"). Injected directly by class, no
// repository interface/Symbol port.
@Injectable()
export class UnitPrismaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAllPaginated(skip: number, take: number): Promise<{ items: Unit[]; total: number }> {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.unit.findMany({ skip, take, orderBy: { name: 'asc' } }),
      this.prisma.unit.count(),
    ]);
    return { items, total };
  }

  async findById(id: string): Promise<Unit | null> {
    return this.prisma.unit.findUnique({ where: { id } });
  }

  async create(name: string): Promise<Unit> {
    return this.prisma.unit.create({ data: { name } });
  }

  async update(id: string, data: { name?: string; status?: UnitStatus }): Promise<Unit> {
    return this.prisma.unit.update({ where: { id }, data });
  }
}
