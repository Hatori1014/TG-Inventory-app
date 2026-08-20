import { ListMinimumStockUseCase } from './list-minimum-stock.use-case';
import { MinimumStockPrismaRepository } from '../../infrastructure/minimum-stock.prisma.repository';

describe('ListMinimumStockUseCase', () => {
  let useCase: ListMinimumStockUseCase;
  let repository: jest.Mocked<MinimumStockPrismaRepository>;

  beforeEach(() => {
    repository = {
      findAllPaginated: jest.fn(),
    } as unknown as jest.Mocked<MinimumStockPrismaRepository>;
    useCase = new ListMinimumStockUseCase(repository);
  });

  it('returns the paginated list of minimum stock records', async () => {
    repository.findAllPaginated.mockResolvedValue({
      items: [{ id: 'min-1', productId: 'product-1', product: { id: 'product-1', name: 'Arroz' }, minimumQuantity: 10 } as never],
      total: 1,
    });

    const result = await useCase.execute({ page: 1, pageSize: 20 });

    expect(repository.findAllPaginated).toHaveBeenCalledWith(0, 20);
    expect(result).toEqual({
      items: [{ id: 'min-1', productId: 'product-1', productName: 'Arroz', minimumQuantity: 10 }],
      total: 1,
      page: 1,
      pageSize: 20,
    });
  });
});
