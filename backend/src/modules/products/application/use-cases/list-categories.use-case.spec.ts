import { ListCategoriesUseCase } from './list-categories.use-case';
import { CategoryPrismaRepository } from '../../infrastructure/category.prisma.repository';
import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';

describe('ListCategoriesUseCase', () => {
  let useCase: ListCategoriesUseCase;
  let repository: jest.Mocked<CategoryPrismaRepository>;

  beforeEach(() => {
    repository = {
      findAllPaginated: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<CategoryPrismaRepository>;
    useCase = new ListCategoriesUseCase(repository);
  });

  it('translates page/pageSize into skip/take and returns a paginated response', async () => {
    repository.findAllPaginated.mockResolvedValue({
      items: [{ id: '1', name: 'Alimentos', status: 'active' }],
      total: 1,
    });

    const query: PaginationQueryDto = { page: 2, pageSize: 10 };
    const result = await useCase.execute(query);

    expect(repository.findAllPaginated).toHaveBeenCalledWith(10, 10);
    expect(result).toEqual({
      items: [{ id: '1', name: 'Alimentos', status: 'active' }],
      total: 1,
      page: 2,
      pageSize: 10,
    });
  });
});
