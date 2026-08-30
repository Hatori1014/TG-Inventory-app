import { ListErrorEventsUseCase } from './list-error-events.use-case';
import { ErrorEventPrismaRepository } from '../../infrastructure/error-event.prisma.repository';

describe('ListErrorEventsUseCase', () => {
  let useCase: ListErrorEventsUseCase;
  let repository: jest.Mocked<ErrorEventPrismaRepository>;

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      findAllPaginated: jest.fn(),
    } as unknown as jest.Mocked<ErrorEventPrismaRepository>;
    useCase = new ListErrorEventsUseCase(repository);
  });

  it('returns a paginated, mapped list and forwards filters to the repository', async () => {
    repository.findAllPaginated.mockResolvedValue({
      items: [
        {
          id: 'err-1',
          userId: 'user-1',
          module: 'roles',
          action: 'delete',
          method: 'DELETE',
          path: '/roles/role-1',
          statusCode: 403,
          message: 'Forbidden',
          occurredAt: new Date('2026-08-26T00:00:00Z'),
          user: { id: 'user-1', name: 'Ada Admin', email: 'ada@example.com' },
        },
      ],
      total: 1,
    });

    const result = await useCase.execute({ page: 1, pageSize: 20, module: 'roles' });

    expect(repository.findAllPaginated).toHaveBeenCalledWith(0, 20, { module: 'roles', action: undefined });
    expect(result).toEqual({
      items: [
        {
          id: 'err-1',
          userId: 'user-1',
          userLabel: 'Ada Admin <ada@example.com>',
          module: 'roles',
          action: 'delete',
          method: 'DELETE',
          path: '/roles/role-1',
          statusCode: 403,
          message: 'Forbidden',
          occurredAt: new Date('2026-08-26T00:00:00Z'),
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
    });
  });

  it('maps a null user (e.g. an anonymous 401) to a null userLabel', async () => {
    repository.findAllPaginated.mockResolvedValue({
      items: [
        {
          id: 'err-2',
          userId: null,
          module: null,
          action: null,
          method: 'POST',
          path: '/auth/login',
          statusCode: 401,
          message: 'Usuario o contraseña incorrectos',
          occurredAt: new Date('2026-08-26T00:00:00Z'),
          user: null,
        },
      ],
      total: 1,
    });

    const result = await useCase.execute({ page: 1, pageSize: 20 });

    expect(result.items[0].userLabel).toBeNull();
  });
});
