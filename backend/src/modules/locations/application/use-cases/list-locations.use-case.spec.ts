import { ListLocationsUseCase } from './list-locations.use-case';
import { LocationPrismaRepository } from '../../infrastructure/location.prisma.repository';

describe('ListLocationsUseCase', () => {
  let useCase: ListLocationsUseCase;
  let repository: jest.Mocked<LocationPrismaRepository>;

  beforeEach(() => {
    repository = {
      findAllPaginated: jest.fn(),
      findById: jest.fn(),
      findByParentAndName: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<LocationPrismaRepository>;
    useCase = new ListLocationsUseCase(repository);
  });

  it('returns a paginated, mapped list of locations', async () => {
    repository.findAllPaginated.mockResolvedValue({
      items: [{ id: '1', name: 'Sede Central', parentId: null, status: 'active' }],
      total: 1,
    });

    const result = await useCase.execute({ page: 1, pageSize: 20 });

    expect(repository.findAllPaginated).toHaveBeenCalledWith(0, 20);
    expect(result).toEqual({
      items: [{ id: '1', name: 'Sede Central', parentId: null, status: 'active' }],
      total: 1,
      page: 1,
      pageSize: 20,
    });
  });
});
