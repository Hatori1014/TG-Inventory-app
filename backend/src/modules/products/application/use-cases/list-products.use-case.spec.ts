import { ListProductsUseCase } from './list-products.use-case';
import { ProductPrismaRepository } from '../../infrastructure/product.prisma.repository';
import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';

describe('ListProductsUseCase', () => {
  let useCase: ListProductsUseCase;
  let repository: jest.Mocked<ProductPrismaRepository>;

  const unit = { id: 'unit-1', name: 'Kilogramo', status: 'active' as const };

  beforeEach(() => {
    repository = {
      findAllPaginated: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<ProductPrismaRepository>;
    useCase = new ListProductsUseCase(repository);
  });

  it('translates page/pageSize into skip/take and returns a paginated response', async () => {
    repository.findAllPaginated.mockResolvedValue({
      items: [
        {
          id: '1',
          name: 'Arroz',
          description: null,
          unitId: 'unit-1',
          unit,
          categoryId: null,
          category: null,
          requiresBatch: false,
          imageUrl: null,
          status: 'active',
        },
      ],
      total: 1,
    });

    const query: PaginationQueryDto = { page: 1, pageSize: 20 };
    const result = await useCase.execute(query);

    expect(repository.findAllPaginated).toHaveBeenCalledWith(0, 20);
    expect(result.items).toEqual([
      {
        id: '1',
        name: 'Arroz',
        description: null,
        unit,
        category: null,
        requiresBatch: false,
        imageUrl: null,
        status: 'active',
      },
    ]);
    expect(result.total).toBe(1);
  });
});
