import { NotFoundException } from '@nestjs/common';
import { GetPurchaseUseCase } from './get-purchase.use-case';
import { PurchasePrismaRepository } from '../../infrastructure/purchase.prisma.repository';

describe('GetPurchaseUseCase', () => {
  let useCase: GetPurchaseUseCase;
  let repository: jest.Mocked<PurchasePrismaRepository>;

  beforeEach(() => {
    repository = {
      findSupplierStatus: jest.fn(),
      findProductRequiresBatch: jest.fn(),
      findLocationStatus: jest.fn(),
      findById: jest.fn(),
      findAllPaginated: jest.fn(),
      registerPurchase: jest.fn(),
    } as unknown as jest.Mocked<PurchasePrismaRepository>;
    useCase = new GetPurchaseUseCase(repository);
  });

  it('returns the purchase mapped when found', async () => {
    repository.findById.mockResolvedValue({
      id: 'purchase-1',
      supplierId: 'supplier-1',
      supplier: { id: 'supplier-1', name: 'Acme Corp' },
      userId: 'user-1',
      purchasedAt: new Date('2026-08-19T00:00:00.000Z'),
      status: 'received',
      items: [],
    } as never);

    const result = await useCase.execute('purchase-1');

    expect(result.id).toBe('purchase-1');
    expect(result.totalAmount).toBe(0);
  });

  it('throws NotFoundException when the purchase does not exist', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(useCase.execute('missing')).rejects.toThrow(NotFoundException);
  });
});
