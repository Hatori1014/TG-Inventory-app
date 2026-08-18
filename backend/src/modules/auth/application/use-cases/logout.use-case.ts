import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';

// ADR-32 — real invalidation for an otherwise-stateless JWT: stores the
// token's jti until its own natural expiry, so JwtStrategy can reject it on
// every subsequent request. upsert makes a repeated logout on the same
// token a no-op instead of a conflict — "already logged out" isn't an error.
@Injectable()
export class LogoutUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(jti: string | undefined, exp: number | undefined): Promise<void> {
    // Tokens issued before this change carry no jti and can't be targeted —
    // nothing to revoke, but the request itself already required a valid
    // token, so it still succeeds from the caller's point of view.
    if (!jti || !exp) return;

    await this.prisma.revokedToken.upsert({
      where: { jti },
      update: {},
      create: { jti, expiresAt: new Date(exp * 1000) },
    });
  }
}
