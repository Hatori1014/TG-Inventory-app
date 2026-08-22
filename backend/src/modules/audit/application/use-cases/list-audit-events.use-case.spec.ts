import { ListAuditEventsUseCase } from './list-audit-events.use-case';
import { AuditEventPrismaRepository } from '../../infrastructure/audit-event.prisma.repository';

describe('ListAuditEventsUseCase', () => {
  let useCase: ListAuditEventsUseCase;
  let repository: jest.Mocked<AuditEventPrismaRepository>;

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      findAllPaginated: jest.fn(),
    } as unknown as jest.Mocked<AuditEventPrismaRepository>;
    useCase = new ListAuditEventsUseCase(repository);
  });

  it('returns a paginated, mapped list and forwards filters to the repository', async () => {
    repository.findAllPaginated.mockResolvedValue({
      items: [
        {
          id: 'evt-1',
          userId: 'user-1',
          action: 'role.delete',
          entity: 'Role',
          entityId: 'role-1',
          occurredAt: new Date('2026-08-22T00:00:00Z'),
          user: { id: 'user-1', name: 'Ada Admin', email: 'ada@example.com' },
        },
      ],
      total: 1,
    });

    const result = await useCase.execute({ page: 1, pageSize: 20, entity: 'Role' });

    expect(repository.findAllPaginated).toHaveBeenCalledWith(0, 20, {
      entity: 'Role',
      action: undefined,
      userId: undefined,
    });
    expect(result).toEqual({
      items: [
        {
          id: 'evt-1',
          userId: 'user-1',
          userLabel: 'Ada Admin <ada@example.com>',
          action: 'role.delete',
          entity: 'Role',
          entityId: 'role-1',
          occurredAt: new Date('2026-08-22T00:00:00Z'),
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
    });
  });

  it('maps a null user (failed login against an unknown email) to a null userLabel', async () => {
    repository.findAllPaginated.mockResolvedValue({
      items: [
        {
          id: 'evt-2',
          userId: null,
          action: 'login.failed',
          entity: 'User',
          entityId: 'nobody@example.com',
          occurredAt: new Date('2026-08-22T00:00:00Z'),
          user: null,
        },
      ],
      total: 1,
    });

    const result = await useCase.execute({ page: 1, pageSize: 20 });

    expect(result.items[0].userLabel).toBeNull();
  });
});
