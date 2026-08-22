import { RecordAuditEventUseCase } from './record-audit-event.use-case';
import { AuditEventPrismaRepository } from '../../infrastructure/audit-event.prisma.repository';

describe('RecordAuditEventUseCase', () => {
  let useCase: RecordAuditEventUseCase;
  let repository: jest.Mocked<AuditEventPrismaRepository>;

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      findAllPaginated: jest.fn(),
    } as unknown as jest.Mocked<AuditEventPrismaRepository>;
    useCase = new RecordAuditEventUseCase(repository);
  });

  it('persists the event through the repository', async () => {
    repository.create.mockResolvedValue({} as never);

    await useCase.execute({ userId: 'user-1', action: 'login.success', entity: 'User', entityId: 'user-1' });

    expect(repository.create).toHaveBeenCalledWith({
      userId: 'user-1',
      action: 'login.success',
      entity: 'User',
      entityId: 'user-1',
    });
  });

  it('accepts a null userId (failed login against an unknown email)', async () => {
    repository.create.mockResolvedValue({} as never);

    await useCase.execute({ userId: null, action: 'login.failed', entity: 'User', entityId: 'nobody@example.com' });

    expect(repository.create).toHaveBeenCalledWith({
      userId: null,
      action: 'login.failed',
      entity: 'User',
      entityId: 'nobody@example.com',
    });
  });

  it('swallows a repository failure instead of throwing, so the audited action never breaks', async () => {
    repository.create.mockRejectedValue(new Error('DB unreachable'));

    await expect(
      useCase.execute({ userId: 'user-1', action: 'role.delete', entity: 'Role', entityId: 'role-1' }),
    ).resolves.toBeUndefined();
  });
});
