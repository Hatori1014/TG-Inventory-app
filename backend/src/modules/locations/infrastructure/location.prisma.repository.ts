import { Injectable } from '@nestjs/common';
import { Location, LocationStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';

// No domain/ layer — Location is trivial CRUD (convenciones.md: "CRUD
// triviales pueden empezar sin las 4 capas"). Injected directly by class,
// no repository interface/Symbol port.
@Injectable()
export class LocationPrismaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAllPaginated(skip: number, take: number): Promise<{ items: Location[]; total: number }> {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.location.findMany({ skip, take, orderBy: { name: 'asc' } }),
      this.prisma.location.count(),
    ]);
    return { items, total };
  }

  async findById(id: string): Promise<Location | null> {
    return this.prisma.location.findUnique({ where: { id } });
  }

  // Postgres composite unique indexes treat every NULL parent_id as
  // distinct, so it never dedupes root-level names on its own — this is
  // the explicit check the use-cases run for that case.
  async findByParentAndName(parentId: string | null, name: string): Promise<Location | null> {
    return this.prisma.location.findFirst({ where: { parentId, name } });
  }

  async create(data: { name: string; parentId?: string }): Promise<Location> {
    return this.prisma.location.create({
      data: { name: data.name, parentId: data.parentId },
    });
  }

  async update(
    id: string,
    data: { name?: string; parentId?: string; status?: LocationStatus },
  ): Promise<Location> {
    return this.prisma.location.update({ where: { id }, data });
  }
}
