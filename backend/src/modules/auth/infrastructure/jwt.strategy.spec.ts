import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { PrismaService } from '../../../database/prisma.service';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let prisma: { revokedToken: { findUnique: jest.Mock } };

  const payload = {
    sub: '1',
    email: 'admin@tg-group.local',
    name: 'Admin',
    role: 'Administrador',
    jti: 'token-id',
    exp: 1234567890,
  };

  beforeEach(() => {
    prisma = { revokedToken: { findUnique: jest.fn() } };
    const config = { get: jest.fn().mockReturnValue('test-secret-at-least-16-chars') } as unknown as ConfigService;
    strategy = new JwtStrategy(config, prisma as unknown as PrismaService);
  });

  it('returns the authenticated user when the token was not revoked', async () => {
    prisma.revokedToken.findUnique.mockResolvedValue(null);

    const result = await strategy.validate(payload);

    expect(prisma.revokedToken.findUnique).toHaveBeenCalledWith({ where: { jti: 'token-id' } });
    expect(result).toEqual({
      id: '1',
      email: 'admin@tg-group.local',
      name: 'Admin',
      role: 'Administrador',
      jti: 'token-id',
      exp: 1234567890,
    });
  });

  it('throws UnauthorizedException when the token jti was revoked', async () => {
    prisma.revokedToken.findUnique.mockResolvedValue({ jti: 'token-id' });

    await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
  });

  it('skips the revocation check for a token with no jti', async () => {
    const legacyPayload = { sub: '1', email: 'admin@tg-group.local', name: 'Admin', role: 'Administrador' };

    const result = await strategy.validate(legacyPayload);

    expect(prisma.revokedToken.findUnique).not.toHaveBeenCalled();
    expect(result.id).toBe('1');
  });
});
