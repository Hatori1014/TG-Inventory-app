import { RecordErrorEventUseCase } from './record-error-event.use-case';
import { ErrorEventPrismaRepository } from '../../infrastructure/error-event.prisma.repository';

describe('RecordErrorEventUseCase', () => {
  let useCase: RecordErrorEventUseCase;
  let repository: jest.Mocked<ErrorEventPrismaRepository>;

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      findAllPaginated: jest.fn(),
    } as unknown as jest.Mocked<ErrorEventPrismaRepository>;
    useCase = new RecordErrorEventUseCase(repository);
  });

  it('persists the error event through the repository', async () => {
    repository.create.mockResolvedValue({} as never);

    await useCase.execute({
      userId: 'user-1',
      module: 'roles',
      action: 'delete',
      method: 'DELETE',
      path: '/roles/role-1',
      statusCode: 403,
      message: 'Forbidden',
    });

    expect(repository.create).toHaveBeenCalledWith({
      userId: 'user-1',
      module: 'roles',
      action: 'delete',
      method: 'DELETE',
      path: '/roles/role-1',
      statusCode: 403,
      message: 'Forbidden',
    });
  });

  it('accepts null module/action/userId for a route with no @RequirePermission() or no authenticated caller', async () => {
    repository.create.mockResolvedValue({} as never);

    await useCase.execute({
      userId: null,
      module: null,
      action: null,
      method: 'POST',
      path: '/auth/login',
      statusCode: 401,
      message: 'Usuario o contraseña incorrectos',
    });

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: null, module: null, action: null }),
    );
  });

  it('swallows a repository failure instead of throwing, so the error response is never affected', async () => {
    repository.create.mockRejectedValue(new Error('DB unreachable'));

    await expect(
      useCase.execute({
        userId: null,
        module: null,
        action: null,
        method: 'GET',
        path: '/health',
        statusCode: 500,
        message: 'Internal server error',
      }),
    ).resolves.toBeUndefined();
  });
});
