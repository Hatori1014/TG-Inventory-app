import { Injectable } from '@nestjs/common';
import { PersonType, PersonTypeStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';

// No domain/ layer — trivial CRUD (convenciones.md). Injected directly by
// class, no repository interface/Symbol port. Same shape as
// UnitPrismaRepository/CategoryPrismaRepository (TT-23).
@Injectable()
export class PersonTypePrismaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAllPaginated(skip: number, take: number): Promise<{ items: PersonType[]; total: number }> {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.personType.findMany({ skip, take, orderBy: { name: 'asc' } }),
      this.prisma.personType.count(),
    ]);
    return { items, total };
  }

  async findById(id: string): Promise<PersonType | null> {
    return this.prisma.personType.findUnique({ where: { id } });
  }

  async create(name: string): Promise<PersonType> {
    return this.prisma.personType.create({ data: { name } });
  }

  async update(id: string, data: { name?: string; status?: PersonTypeStatus }): Promise<PersonType> {
    return this.prisma.personType.update({ where: { id }, data });
  }
}
