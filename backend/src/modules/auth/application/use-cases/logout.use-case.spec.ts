import { LogoutUseCase } from './logout.use-case';
import { PrismaService } from '../../../../database/prisma.service';

describe('LogoutUseCase', () => {
  let useCase: LogoutUseCase;
  let prisma: { revokedToken: { upsert: jest.Mock } };

  beforeEach(() => {
    prisma = { revokedToken: { upsert: jest.fn().mockResolvedValue({}) } };
    useCase = new LogoutUseCase(prisma as unknown as PrismaService);
  });

  it('stores the token jti with its natural expiry as revoked', async () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;

    await useCase.execute('token-id', exp);

    expect(prisma.revokedToken.upsert).toHaveBeenCalledWith({
      where: { jti: 'token-id' },
      update: {},
      create: { jti: 'token-id', expiresAt: new Date(exp * 1000) },
    });
  });

  it('is idempotent — logging out an already-revoked token does not throw', async () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;

    await useCase.execute('token-id', exp);
    await expect(useCase.execute('token-id', exp)).resolves.toBeUndefined();

    expect(prisma.revokedToken.upsert).toHaveBeenCalledTimes(2);
  });

  it('does nothing for a token with no jti (issued before logout support existed)', async () => {
    await useCase.execute(undefined, undefined);

    expect(prisma.revokedToken.upsert).not.toHaveBeenCalled();
  });
});
