import { ListPurchasesUseCase } from './list-purchases.use-case';
import { PurchasePrismaRepository } from '../../infrastructure/purchase.prisma.repository';

describe('ListPurchasesUseCase', () => {
  let useCase: ListPurchasesUseCase;
  let repository: jest.Mocked<PurchasePrismaRepository>;

  const purchase = {
    id: 'purchase-1',
    supplierId: 'supplier-1',
    supplier: { id: 'supplier-1', name: 'Acme Corp' },
    userId: 'user-1',
    purchasedAt: new Date('2026-08-19T00:00:00.000Z'),
    status: 'received' as const,
    items: [
      {
        id: 'item-1',
        productId: 'product-1',
        product: { id: 'product-1', name: 'Arroz' },
        locationId: 'location-1',
        location: { id: 'location-1', name: 'Bodega A' },
        batchId: null,
        batch: null,
        quantity: 10,
        unitPrice: 2.5,
      },
    ],
  };

  beforeEach(() => {
    repository = {
      findSupplierStatus: jest.fn(),
      findProductRequiresBatch: jest.fn(),
      findLocationStatus: jest.fn(),
      findById: jest.fn(),
      findAllPaginated: jest.fn(),
      registerPurchase: jest.fn(),
    } as unknown as jest.Mocked<PurchasePrismaRepository>;
    useCase = new ListPurchasesUseCase(repository);
  });

  it('returns a paginated, mapped list of purchases with the computed total', async () => {
    repository.findAllPaginated.mockResolvedValue({ items: [purchase as never], total: 1 });

    const result = await useCase.execute({ page: 1, pageSize: 20 });

    expect(repository.findAllPaginated).toHaveBeenCalledWith(0, 20, { supplierId: undefined });
    expect(result.total).toBe(1);
    expect(result.items[0].totalAmount).toBe(25);
  });

  it('passes the supplierId filter through to the repository', async () => {
    repository.findAllPaginated.mockResolvedValue({ items: [], total: 0 });

    await useCase.execute({ page: 1, pageSize: 20, supplierId: 'supplier-1' });

    expect(repository.findAllPaginated).toHaveBeenCalledWith(0, 20, { supplierId: 'supplier-1' });
  });
});
