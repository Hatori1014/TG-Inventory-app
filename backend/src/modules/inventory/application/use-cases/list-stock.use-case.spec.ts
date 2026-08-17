import { ListStockUseCase } from './list-stock.use-case';
import { InventoryPrismaRepository } from '../../infrastructure/inventory.prisma.repository';

describe('ListStockUseCase', () => {
  let useCase: ListStockUseCase;
  let repository: jest.Mocked<InventoryPrismaRepository>;

  beforeEach(() => {
    repository = {
      findLocationStatus: jest.fn(),
      registerMovement: jest.fn(),
      findStockPaginated: jest.fn(),
    } as unknown as jest.Mocked<InventoryPrismaRepository>;
    useCase = new ListStockUseCase(repository);
  });

  it('returns a paginated, mapped list of stock rows with nested product/location', async () => {
    repository.findStockPaginated.mockResolvedValue({
      items: [
        {
          id: 's1',
          product: { id: 'p1', name: 'Arroz' },
          location: { id: 'l1', name: 'Bodega A' },
          batchId: null,
          quantity: 10,
        } as any,
      ],
      total: 1,
    });

    const result = await useCase.execute({ page: 1, pageSize: 20 });

    expect(repository.findStockPaginated).toHaveBeenCalledWith(0, 20, {
      productId: undefined,
      locationId: undefined,
    });
    expect(result).toEqual({
      items: [
        {
          id: 's1',
          product: { id: 'p1', name: 'Arroz' },
          location: { id: 'l1', name: 'Bodega A' },
          batchId: null,
          quantity: 10,
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
    });
  });

  it('passes productId/locationId filters through to the repository', async () => {
    repository.findStockPaginated.mockResolvedValue({ items: [], total: 0 });

    await useCase.execute({ page: 1, pageSize: 20, productId: 'p1', locationId: 'l1' });

    expect(repository.findStockPaginated).toHaveBeenCalledWith(0, 20, { productId: 'p1', locationId: 'l1' });
  });
});
