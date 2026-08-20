import { ListRequestsUseCase } from './list-requests.use-case';
import { RequestPrismaRepository } from '../../infrastructure/request.prisma.repository';

describe('ListRequestsUseCase', () => {
  let useCase: ListRequestsUseCase;
  let repository: jest.Mocked<RequestPrismaRepository>;

  beforeEach(() => {
    repository = { findAllPaginated: jest.fn() } as unknown as jest.Mocked<RequestPrismaRepository>;
    useCase = new ListRequestsUseCase(repository);
  });

  it('scopes the listing to the caller\'s own requests', async () => {
    repository.findAllPaginated.mockResolvedValue({ items: [], total: 0 });

    await useCase.execute('user-1', { page: 1, pageSize: 20 });

    expect(repository.findAllPaginated).toHaveBeenCalledWith(0, 20, {
      requesterId: 'user-1',
      type: undefined,
      status: undefined,
    });
  });

  it('passes through type/status filters', async () => {
    repository.findAllPaginated.mockResolvedValue({ items: [], total: 0 });

    await useCase.execute('user-1', { page: 1, pageSize: 20, type: 'purchase', status: 'draft' });

    expect(repository.findAllPaginated).toHaveBeenCalledWith(0, 20, {
      requesterId: 'user-1',
      type: 'purchase',
      status: 'draft',
    });
  });
});
