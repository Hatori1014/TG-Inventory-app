import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { User, UserStatus } from '../domain/user.entity';
import { CreateUserData, UpdateUserData, UserRepository } from '../domain/user.repository.interface';

const userWithRole = Prisma.validator<Prisma.UserDefaultArgs>()({
  include: { role: true },
});
type UserWithRole = Prisma.UserGetPayload<typeof userWithRole>;

function toDomain(row: UserWithRole): User {
  return new User(
    row.id,
    row.name,
    row.email,
    row.passwordHash,
    row.roleId,
    row.role.name,
    row.status as UserStatus,
  );
}

@Injectable()
export class UserPrismaRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly include = userWithRole.include;

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { email }, include: this.include });
    return row ? toDomain(row) : null;
  }

  async findById(id: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { id }, include: this.include });
    return row ? toDomain(row) : null;
  }

  async findAllPaginated(skip: number, take: number): Promise<{ items: User[]; total: number }> {
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({ skip, take, include: this.include, orderBy: { name: 'asc' } }),
      this.prisma.user.count(),
    ]);
    return { items: rows.map(toDomain), total };
  }

  async create(data: CreateUserData): Promise<User> {
    const row = await this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash: data.passwordHash,
        roleId: data.roleId,
      },
      include: this.include,
    });
    return toDomain(row);
  }

  async update(id: string, data: UpdateUserData): Promise<User> {
    const row = await this.prisma.user.update({
      where: { id },
      data: {
        name: data.name,
        email: data.email,
        roleId: data.roleId,
        status: data.status,
      },
      include: this.include,
    });
    return toDomain(row);
  }
}
