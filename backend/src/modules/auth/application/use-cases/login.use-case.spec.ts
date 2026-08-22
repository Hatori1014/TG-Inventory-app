import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginUseCase } from './login.use-case';
import { ValidateUserCredentialsUseCase } from '../../../users/application/use-cases/validate-user-credentials.use-case';
import { RecordAuditEventUseCase } from '../../../audit/application/use-cases/record-audit-event.use-case';
import { AuthenticatedUserDto } from '../../../users/dto/authenticated-user.dto';

describe('LoginUseCase', () => {
  let useCase: LoginUseCase;
  let validateUserCredentials: jest.Mocked<ValidateUserCredentialsUseCase>;
  let jwtService: jest.Mocked<JwtService>;
  let recordAuditEvent: jest.Mocked<RecordAuditEventUseCase>;

  const authenticatedUser: AuthenticatedUserDto = {
    id: '1',
    name: 'Admin',
    email: 'admin@tg-group.local',
    role: 'Administrador',
  };

  beforeEach(() => {
    validateUserCredentials = { execute: jest.fn() } as unknown as jest.Mocked<ValidateUserCredentialsUseCase>;
    jwtService = { sign: jest.fn().mockReturnValue('signed.jwt.token') } as unknown as jest.Mocked<JwtService>;
    recordAuditEvent = { execute: jest.fn() } as unknown as jest.Mocked<RecordAuditEventUseCase>;
    useCase = new LoginUseCase(validateUserCredentials, jwtService, recordAuditEvent);
  });

  it('throws UnauthorizedException and audits the failed attempt without a userId', async () => {
    validateUserCredentials.execute.mockResolvedValue(null);

    await expect(useCase.execute('missing@tg-group.local', 'whatever')).rejects.toThrow(
      UnauthorizedException,
    );
    expect(recordAuditEvent.execute).toHaveBeenCalledWith({
      userId: null,
      action: 'login.failed',
      entity: 'User',
      entityId: 'missing@tg-group.local',
    });
  });

  it('returns an access token, the authenticated user, and audits the successful login', async () => {
    validateUserCredentials.execute.mockResolvedValue(authenticatedUser);

    const result = await useCase.execute(authenticatedUser.email, 'correct-password');

    expect(validateUserCredentials.execute).toHaveBeenCalledWith(
      authenticatedUser.email,
      'correct-password',
    );
    expect(result.accessToken).toBe('signed.jwt.token');
    expect(result.user).toEqual(authenticatedUser);
    expect(jwtService.sign).toHaveBeenCalledWith(
      {
        sub: authenticatedUser.id,
        email: authenticatedUser.email,
        name: authenticatedUser.name,
        role: authenticatedUser.role,
      },
      { jwtid: expect.any(String) },
    );
    expect(recordAuditEvent.execute).toHaveBeenCalledWith({
      userId: authenticatedUser.id,
      action: 'login.success',
      entity: 'User',
      entityId: authenticatedUser.id,
    });
  });
});
