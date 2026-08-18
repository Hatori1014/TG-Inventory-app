import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginUseCase } from './login.use-case';
import { ValidateUserCredentialsUseCase } from '../../../users/application/use-cases/validate-user-credentials.use-case';
import { AuthenticatedUserDto } from '../../../users/dto/authenticated-user.dto';

describe('LoginUseCase', () => {
  let useCase: LoginUseCase;
  let validateUserCredentials: jest.Mocked<ValidateUserCredentialsUseCase>;
  let jwtService: jest.Mocked<JwtService>;

  const authenticatedUser: AuthenticatedUserDto = {
    id: '1',
    name: 'Admin',
    email: 'admin@tg-group.local',
    role: 'Administrador',
  };

  beforeEach(() => {
    validateUserCredentials = { execute: jest.fn() } as unknown as jest.Mocked<ValidateUserCredentialsUseCase>;
    jwtService = { sign: jest.fn().mockReturnValue('signed.jwt.token') } as unknown as jest.Mocked<JwtService>;
    useCase = new LoginUseCase(validateUserCredentials, jwtService);
  });

  it('throws UnauthorizedException when credentials are invalid', async () => {
    validateUserCredentials.execute.mockResolvedValue(null);

    await expect(useCase.execute('missing@tg-group.local', 'whatever')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('returns an access token and the authenticated user on success', async () => {
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
  });
});
