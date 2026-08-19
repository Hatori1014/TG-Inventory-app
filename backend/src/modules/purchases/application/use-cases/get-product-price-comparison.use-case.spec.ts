import { NotFoundException } from '@nestjs/common';
import { GetProductPriceComparisonUseCase } from './get-product-price-comparison.use-case';
import { PurchasePrismaRepository } from '../../infrastructure/purchase.prisma.repository';

describe('GetProductPriceComparisonUseCase', () => {
  let useCase: GetProductPriceComparisonUseCase;
  let repository: jest.Mocked<PurchasePrismaRepository>;

  beforeEach(() => {
    repository = {
      findProductName: jest.fn(),
      findProductPriceHistory: jest.fn(),
    } as unknown as jest.Mocked<PurchasePrismaRepository>;
    useCase = new GetProductPriceComparisonUseCase(repository);
  });

  it('throws NotFoundException when the product does not exist', async () => {
    repository.findProductName.mockResolvedValue(null);

    await expect(useCase.execute('missing')).rejects.toThrow(NotFoundException);
    expect(repository.findProductPriceHistory).not.toHaveBeenCalled();
  });

  it('returns an empty supplier list for a product no one has ever sold', async () => {
    repository.findProductName.mockResolvedValue('Arroz');
    repository.findProductPriceHistory.mockResolvedValue([]);

    const result = await useCase.execute('product-1');

    expect(result).toEqual({ productId: 'product-1', productName: 'Arroz', suppliers: [] });
  });

  it('reduces purchase history to the latest price per supplier, cheapest first', async () => {
    repository.findProductName.mockResolvedValue('Arroz');
    repository.findProductPriceHistory.mockResolvedValue([
      { supplierId: 's1', supplierName: 'Acme', unitPrice: 15, purchasedAt: new Date('2026-08-01') },
      { supplierId: 's2', supplierName: 'Beta', unitPrice: 9, purchasedAt: new Date('2026-08-01') },
    ]);

    const result = await useCase.execute('product-1');

    expect(result.suppliers.map((s) => s.supplierId)).toEqual(['s2', 's1']);
  });
});
