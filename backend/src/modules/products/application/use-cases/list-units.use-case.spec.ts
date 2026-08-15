import { ListUnitsUseCase } from './list-units.use-case';
import { UnitPrismaRepository } from '../../infrastructure/unit.prisma.repository';
import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';

describe('ListUnitsUseCase', () => {
  let useCase: ListUnitsUseCase;
  let repository: jest.Mocked<UnitPrismaRepository>;

  beforeEach(() => {
    repository = {
      findAllPaginated: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<UnitPrismaRepository>;
    useCase = new ListUnitsUseCase(repository);
  });

  it('translates page/pageSize into skip/take and returns a paginated response', async () => {
    repository.findAllPaginated.mockResolvedValue({
      items: [{ id: '1', name: 'Kilogramo', status: 'active' }],
      total: 1,
    });

    const query: PaginationQueryDto = { page: 1, pageSize: 20 };
    const result = await useCase.execute(query);

    expect(repository.findAllPaginated).toHaveBeenCalledWith(0, 20);
    expect(result).toEqual({
      items: [{ id: '1', name: 'Kilogramo', status: 'active' }],
      total: 1,
      page: 1,
      pageSize: 20,
    });
  });
});
