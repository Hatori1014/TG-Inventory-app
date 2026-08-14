import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { LoginUseCase } from './login.use-case';
import { AuthUser } from '../../domain/auth-user.entity';
import { AuthUserRepository } from '../../domain/auth-user.repository.interface';

jest.mock('bcrypt');

describe('LoginUseCase', () => {
  let useCase: LoginUseCase;
  let repository: jest.Mocked<AuthUserRepository>;
  let jwtService: jest.Mocked<JwtService>;

  const activeUser = new AuthUser('1', 'Admin', 'admin@tg-group.local', 'hashed', 'Administrador', 'active');
  const blockedUser = new AuthUser('2', 'Blocked', 'blocked@tg-group.local', 'hashed', 'Administrador', 'blocked');

  beforeEach(() => {
    repository = { findByEmail: jest.fn() };
    jwtService = { sign: jest.fn().mockReturnValue('signed.jwt.token') } as unknown as jest.Mocked<JwtService>;
    useCase = new LoginUseCase(repository, jwtService);
    jest.clearAllMocks();
  });

  it('throws UnauthorizedException when no user matches the email', async () => {
    repository.findByEmail.mockResolvedValue(null);

    await expect(useCase.execute('missing@tg-group.local', 'whatever')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('throws UnauthorizedException when the password does not match', async () => {
    repository.findByEmail.mockResolvedValue(activeUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(useCase.execute(activeUser.getEmail(), 'wrong-password')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('throws UnauthorizedException when the user is blocked, even with a correct password', async () => {
    repository.findByEmail.mockResolvedValue(blockedUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    await expect(useCase.execute(blockedUser.getEmail(), 'correct-password')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('throws the same error message for a missing user, a wrong password, and a blocked user', async () => {
    repository.findByEmail.mockResolvedValueOnce(null);
    const missingUserError = await useCase
      .execute('missing@tg-group.local', 'x')
      .catch((error) => error);

    repository.findByEmail.mockResolvedValueOnce(activeUser);
    (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);
    const wrongPasswordError = await useCase
      .execute(activeUser.getEmail(), 'wrong')
      .catch((error) => error);

    repository.findByEmail.mockResolvedValueOnce(blockedUser);
    (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);
    const blockedUserError = await useCase
      .execute(blockedUser.getEmail(), 'correct')
      .catch((error) => error);

    expect(missingUserError.message).toBe(wrongPasswordError.message);
    expect(wrongPasswordError.message).toBe(blockedUserError.message);
  });

  it('returns an access token and the authenticated user on success', async () => {
    repository.findByEmail.mockResolvedValue(activeUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const result = await useCase.execute(activeUser.getEmail(), 'correct-password');

    expect(result.accessToken).toBe('signed.jwt.token');
    expect(result.user).toEqual({
      id: activeUser.getId(),
      name: activeUser.getName(),
      email: activeUser.getEmail(),
      role: activeUser.getRoleName(),
    });
    expect(jwtService.sign).toHaveBeenCalledWith({
      sub: activeUser.getId(),
      email: activeUser.getEmail(),
      name: activeUser.getName(),
      role: activeUser.getRoleName(),
    });
  });
});
