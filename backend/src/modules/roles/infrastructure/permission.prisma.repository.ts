import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Permission } from '../domain/permission.value-object';
import { PermissionRepository } from '../domain/permission.repository.interface';

@Injectable()
export class PermissionPrismaRepository implements PermissionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAllPaginated(
    skip: number,
    take: number,
  ): Promise<{ items: Permission[]; total: number }> {
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.permission.findMany({ skip, take, orderBy: [{ module: 'asc' }, { action: 'asc' }] }),
      this.prisma.permission.count(),
    ]);
    return { items: rows.map((r) => new Permission(r.module, r.action, r.id)), total };
  }

  async findManyByIds(ids: string[]): Promise<Permission[]> {
    if (ids.length === 0) return [];
    const rows = await this.prisma.permission.findMany({ where: { id: { in: ids } } });
    return rows.map((r) => new Permission(r.module, r.action, r.id));
  }
}
