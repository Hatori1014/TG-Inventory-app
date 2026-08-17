import { Injectable } from '@nestjs/common';
import { Category, CategoryStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';

// No domain/ layer — Category is trivial CRUD (convenciones.md: "CRUD
// triviales pueden empezar sin las 4 capas"). Injected directly by class,
// no repository interface/Symbol port.
@Injectable()
export class CategoryPrismaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAllPaginated(skip: number, take: number): Promise<{ items: Category[]; total: number }> {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.category.findMany({ skip, take, orderBy: { name: 'asc' } }),
      this.prisma.category.count(),
    ]);
    return { items, total };
  }

  async findById(id: string): Promise<Category | null> {
    return this.prisma.category.findUnique({ where: { id } });
  }

  async create(name: string): Promise<Category> {
    return this.prisma.category.create({ data: { name } });
  }

  async update(id: string, data: { name?: string; status?: CategoryStatus }): Promise<Category> {
    return this.prisma.category.update({ where: { id }, data });
  }
}
