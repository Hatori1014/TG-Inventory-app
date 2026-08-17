import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  role: string;
}

// ADR-24 — stateless: validate() trusts the signed claim and never re-queries
// the database, so a user blocked after their token was issued keeps access
// until it expires (JWT_EXPIRES_IN). Accepted trade-off for MVP1; revisit
// when HU-20 (lockout) lands.
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET'),
    });
  }

  validate(payload: JwtPayload) {
    return { id: payload.sub, email: payload.email, name: payload.name, role: payload.role };
  }
}
