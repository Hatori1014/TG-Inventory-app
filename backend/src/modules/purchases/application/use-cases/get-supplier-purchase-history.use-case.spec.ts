import { NotFoundException } from '@nestjs/common';
import { GetSupplierPurchaseHistoryUseCase } from './get-supplier-purchase-history.use-case';
import { PurchasePrismaRepository } from '../../infrastructure/purchase.prisma.repository';

describe('GetSupplierPurchaseHistoryUseCase', () => {
  let useCase: GetSupplierPurchaseHistoryUseCase;
  let repository: jest.Mocked<PurchasePrismaRepository>;

  const purchase = {
    id: 'purchase-1',
    supplierId: 'supplier-1',
    supplier: { id: 'supplier-1', name: 'Acme Corp' },
    userId: 'user-1',
    purchasedAt: new Date('2026-08-19T00:00:00.000Z'),
    status: 'received' as const,
    items: [],
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
    useCase = new GetSupplierPurchaseHistoryUseCase(repository);
  });

  it('throws NotFoundException when the supplier does not exist', async () => {
    repository.findSupplierStatus.mockResolvedValue(null);

    await expect(useCase.execute('missing', { page: 1, pageSize: 20 })).rejects.toThrow(NotFoundException);
    expect(repository.findAllPaginated).not.toHaveBeenCalled();
  });

  it('returns a clear empty state when the supplier exists but has no purchases', async () => {
    repository.findSupplierStatus.mockResolvedValue('active');
    repository.findAllPaginated.mockResolvedValue({ items: [], total: 0 });

    const result = await useCase.execute('supplier-1', { page: 1, pageSize: 20 });

    expect(result).toEqual({ items: [], total: 0, page: 1, pageSize: 20 });
  });

  it('returns the paginated purchase history for a supplier that has purchases', async () => {
    repository.findSupplierStatus.mockResolvedValue('active');
    repository.findAllPaginated.mockResolvedValue({ items: [purchase as never], total: 1 });

    const result = await useCase.execute('supplier-1', { page: 1, pageSize: 20 });

    expect(repository.findAllPaginated).toHaveBeenCalledWith(0, 20, { supplierId: 'supplier-1' });
    expect(result.items[0].id).toBe('purchase-1');
  });

  it('works for a supplier that is inactive but still has a purchase history to review', async () => {
    repository.findSupplierStatus.mockResolvedValue('inactive');
    repository.findAllPaginated.mockResolvedValue({ items: [purchase as never], total: 1 });

    const result = await useCase.execute('supplier-1', { page: 1, pageSize: 20 });

    expect(result.total).toBe(1);
  });
});
