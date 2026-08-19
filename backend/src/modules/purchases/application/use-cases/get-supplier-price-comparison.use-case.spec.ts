import { NotFoundException } from '@nestjs/common';
import { GetSupplierPriceComparisonUseCase } from './get-supplier-price-comparison.use-case';
import { PurchasePrismaRepository } from '../../infrastructure/purchase.prisma.repository';

describe('GetSupplierPriceComparisonUseCase', () => {
  let useCase: GetSupplierPriceComparisonUseCase;
  let repository: jest.Mocked<PurchasePrismaRepository>;

  beforeEach(() => {
    repository = {
      findSuppliersBasicInfo: jest.fn(),
      findSupplierPriceHistory: jest.fn(),
    } as unknown as jest.Mocked<PurchasePrismaRepository>;
    useCase = new GetSupplierPriceComparisonUseCase(repository);
  });

  it('throws NotFoundException when any requested supplier does not exist', async () => {
    repository.findSuppliersBasicInfo.mockResolvedValue([{ id: 's1', name: 'Acme' }]);

    await expect(useCase.execute(['s1', 'missing'])).rejects.toThrow(NotFoundException);
    expect(repository.findSupplierPriceHistory).not.toHaveBeenCalled();
  });

  it('returns suppliers in the requested order, not lookup order', async () => {
    repository.findSuppliersBasicInfo.mockResolvedValue([
      { id: 's2', name: 'Beta' },
      { id: 's1', name: 'Acme' },
    ]);
    repository.findSupplierPriceHistory.mockResolvedValue([]);

    const result = await useCase.execute(['s1', 's2']);

    expect(result.suppliers).toEqual([
      { supplierId: 's1', supplierName: 'Acme' },
      { supplierId: 's2', supplierName: 'Beta' },
    ]);
  });

  it('builds monthly average rows from the price history', async () => {
    repository.findSuppliersBasicInfo.mockResolvedValue([{ id: 's1', name: 'Acme' }]);
    repository.findSupplierPriceHistory.mockResolvedValue([
      { supplierId: 's1', unitPrice: 10, purchasedAt: new Date('2026-06-05') },
    ]);

    const result = await useCase.execute(['s1']);

    expect(result.rows).toEqual([{ month: '2026-06', averageBySupplier: { s1: 10 } }]);
  });
});
