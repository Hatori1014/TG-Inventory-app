import { ListPersonTypesUseCase } from './list-person-types.use-case';
import { PersonTypePrismaRepository } from '../../infrastructure/person-type.prisma.repository';

describe('ListPersonTypesUseCase', () => {
  let useCase: ListPersonTypesUseCase;
  let repository: jest.Mocked<PersonTypePrismaRepository>;

  beforeEach(() => {
    repository = {
      findAllPaginated: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<PersonTypePrismaRepository>;
    useCase = new ListPersonTypesUseCase(repository);
  });

  it('returns a paginated, mapped list of person types', async () => {
    repository.findAllPaginated.mockResolvedValue({
      items: [{ id: '1', name: 'Natural', status: 'active' }],
      total: 1,
    });

    const result = await useCase.execute({ page: 1, pageSize: 20 });

    expect(repository.findAllPaginated).toHaveBeenCalledWith(0, 20);
    expect(result).toEqual({
      items: [{ id: '1', name: 'Natural', status: 'active' }],
      total: 1,
      page: 1,
      pageSize: 20,
    });
  });
});
