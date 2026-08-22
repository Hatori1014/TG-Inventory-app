import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { Role } from '../domain/role.entity';
import { Permission } from '../domain/permission.value-object';
import { RoleRepository } from '../domain/role.repository.interface';

const roleWithPermissions = Prisma.validator<Prisma.RoleDefaultArgs>()({
  include: { permissions: { include: { permission: true } } },
});
type RoleWithPermissions = Prisma.RoleGetPayload<typeof roleWithPermissions>;

function toDomain(row: RoleWithPermissions): Role {
  return new Role(
    row.id,
    row.name,
    row.description,
    row.permissions.map(
      (rp) => new Permission(rp.permission.module, rp.permission.action, rp.permission.id),
    ),
    row.isDefault,
  );
}

@Injectable()
export class RolePrismaRepository implements RoleRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly include = roleWithPermissions.include;

  async findAllPaginated(skip: number, take: number): Promise<{ items: Role[]; total: number }> {
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.role.findMany({ skip, take, include: this.include, orderBy: { name: 'asc' } }),
      this.prisma.role.count(),
    ]);
    return { items: rows.map(toDomain), total };
  }

  // findFirst, not findUnique: PrismaService's ADR-22 extension only
  // auto-filters deletedAt on findMany/findFirst/count — a soft-deleted
  // role must read back as "not found" here too, same as everywhere else.
  async findById(id: string): Promise<Role | null> {
    const row = await this.prisma.role.findFirst({ where: { id }, include: this.include });
    return row ? toDomain(row) : null;
  }

  async findDefault(): Promise<Role | null> {
    const row = await this.prisma.role.findFirst({ where: { isDefault: true }, include: this.include });
    return row ? toDomain(row) : null;
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.role.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async create(name: string, description?: string): Promise<Role> {
    const row = await this.prisma.role.create({
      data: { name, description },
      include: this.include,
    });
    return toDomain(row);
  }

  async replacePermissions(roleId: string, permissionIds: string[]): Promise<Role> {
    return this.prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { roleId } });
      if (permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: permissionIds.map((permissionId) => ({ roleId, permissionId })),
        });
      }
      const row = await tx.role.findUniqueOrThrow({ where: { id: roleId }, include: this.include });
      return toDomain(row);
    });
  }
}
