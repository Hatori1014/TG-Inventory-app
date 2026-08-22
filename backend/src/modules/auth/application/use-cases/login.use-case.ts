import { randomUUID } from 'crypto';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ValidateUserCredentialsUseCase } from '../../../users/application/use-cases/validate-user-credentials.use-case';
import { RecordAuditEventUseCase } from '../../../audit/application/use-cases/record-audit-event.use-case';
import { LoginResponseDto } from '../../dto/login-response.dto';

const INVALID_CREDENTIALS_MESSAGE = 'Usuario o contraseña incorrectos';

// HU-03/ADR-26 — credential validation itself (bcrypt compare, isActive())
// lives entirely inside UsersModule now; this use-case only turns a valid
// login into a signed token. It structurally cannot tell apart a missing
// user, a wrong password, and a blocked user — ValidateUserCredentialsUseCase
// returns null for all three, so a failed login is always audited with
// userId: null and the attempted email in entityId, never a resolved user.
@Injectable()
export class LoginUseCase {
  private readonly logger = new Logger(LoginUseCase.name);

  constructor(
    private readonly validateUserCredentials: ValidateUserCredentialsUseCase,
    private readonly jwtService: JwtService,
    private readonly recordAuditEvent: RecordAuditEventUseCase,
  ) {}

  async execute(email: string, password: string): Promise<LoginResponseDto> {
    const user = await this.validateUserCredentials.execute(email, password);

    if (!user) {
      this.logger.warn(`Failed login attempt for ${email}`);
      await this.recordAuditEvent.execute({
        userId: null,
        action: 'login.failed',
        entity: 'User',
        entityId: email,
      });
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    const payload = { sub: user.id, email: user.email, name: user.name, role: user.role };
    // ADR-32 — a unique jti per token is what makes POST /auth/logout able
    // to target this specific token in RevokedToken, without affecting any
    // other session the same user has open elsewhere.
    const jti = randomUUID();

    await this.recordAuditEvent.execute({
      userId: user.id,
      action: 'login.success',
      entity: 'User',
      entityId: user.id,
    });

    return {
      accessToken: this.jwtService.sign(payload, { jwtid: jti }),
      user,
    };
  }
}
