import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../database/prisma.service';

export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  role: string;
  jti?: string;
  exp?: number;
}

// ADR-24 — stateless: validate() trusts the signed claim and never re-queries
// the database, so a user blocked after their token was issued keeps access
// until it expires (JWT_EXPIRES_IN). Accepted trade-off for MVP1; revisit
// when HU-20 (lockout) lands.
//
// ADR-32 — the one exception: a token whose jti was explicitly revoked via
// POST /auth/logout is rejected here even though it's still
// signature/expiry-valid. Tokens issued before this change have no jti and
// simply can't be revoked — the check is skipped for them, not treated as
// an error.
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    if (payload.jti) {
      const revoked = await this.prisma.revokedToken.findUnique({ where: { jti: payload.jti } });
      if (revoked) {
        throw new UnauthorizedException('La sesión fue cerrada');
      }
    }

    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role,
      jti: payload.jti,
      exp: payload.exp,
    };
  }
}
