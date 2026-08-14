import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { AuthUser, AuthUserStatus } from '../domain/auth-user.entity';
import { AuthUserRepository } from '../domain/auth-user.repository.interface';

@Injectable()
export class UserPrismaRepository implements AuthUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<AuthUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });

    if (!user) {
      return null;
    }

    return new AuthUser(
      user.id,
      user.name,
      user.email,
      user.passwordHash,
      user.role.name,
      user.status as AuthUserStatus,
    );
  }
}
