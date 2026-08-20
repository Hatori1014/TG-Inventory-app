import { BadRequestException } from '@nestjs/common';
import { RegisterPurchaseUseCase } from './register-purchase.use-case';
import { PurchasePrismaRepository } from '../../infrastructure/purchase.prisma.repository';

describe('RegisterPurchaseUseCase', () => {
  let useCase: RegisterPurchaseUseCase;
  let repository: jest.Mocked<PurchasePrismaRepository>;

  const baseDto = {
    supplierId: 'supplier-1',
    items: [{ productId: 'product-1', locationId: 'location-1', quantity: 10, unitPrice: 2.5 }],
  };

  const purchaseWithRelations = {
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
    useCase = new RegisterPurchaseUseCase(repository);

    repository.findSupplierStatus.mockResolvedValue('active');
    repository.findProductRequiresBatch.mockResolvedValue(false);
    repository.findLocationStatus.mockResolvedValue('active');
    repository.registerPurchase.mockResolvedValue(purchaseWithRelations as never);
  });

  it('registers a purchase and returns it mapped, including the computed total', async () => {
    const result = await useCase.execute(baseDto, 'user-1');

    expect(repository.registerPurchase).toHaveBeenCalledWith({
      supplierId: 'supplier-1',
      userId: 'user-1',
      items: [
        {
          productId: 'product-1',
          locationId: 'location-1',
          batchNumber: undefined,
          batchExpiresAt: undefined,
          quantity: 10,
          unitPrice: 2.5,
        },
      ],
    });
    expect(result.id).toBe('purchase-1');
    expect(result.totalAmount).toBe(25);
  });

  it('throws BadRequestException when supplierId does not exist', async () => {
    repository.findSupplierStatus.mockResolvedValue(null);

    await expect(useCase.execute(baseDto, 'user-1')).rejects.toThrow(BadRequestException);
    expect(repository.registerPurchase).not.toHaveBeenCalled();
  });

  it('throws BadRequestException when the supplier is inactive', async () => {
    repository.findSupplierStatus.mockResolvedValue('inactive');

    await expect(useCase.execute(baseDto, 'user-1')).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException when a productId does not exist', async () => {
    repository.findProductRequiresBatch.mockResolvedValue(null);

    await expect(useCase.execute(baseDto, 'user-1')).rejects.toThrow(BadRequestException);
    expect(repository.registerPurchase).not.toHaveBeenCalled();
  });

  it('throws BadRequestException when a product requires a batch but no batchNumber was sent', async () => {
    repository.findProductRequiresBatch.mockResolvedValue(true);

    await expect(useCase.execute(baseDto, 'user-1')).rejects.toThrow(BadRequestException);
    expect(repository.registerPurchase).not.toHaveBeenCalled();
  });

  it('accepts a product that requires a batch when batchNumber is sent', async () => {
    repository.findProductRequiresBatch.mockResolvedValue(true);
    const dto = {
      supplierId: 'supplier-1',
      items: [{ ...baseDto.items[0], batchNumber: 'LOT-A1', batchExpiresAt: '2027-01-01' }],
    };

    await useCase.execute(dto, 'user-1');

    expect(repository.registerPurchase).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [expect.objectContaining({ batchNumber: 'LOT-A1', batchExpiresAt: '2027-01-01' })],
      }),
    );
  });

  it('throws BadRequestException when a locationId does not exist', async () => {
    repository.findLocationStatus.mockResolvedValue(null);

    await expect(useCase.execute(baseDto, 'user-1')).rejects.toThrow(BadRequestException);
    expect(repository.registerPurchase).not.toHaveBeenCalled();
  });

  it('throws BadRequestException when a locationId is inactive', async () => {
    repository.findLocationStatus.mockResolvedValue('inactive');

    await expect(useCase.execute(baseDto, 'user-1')).rejects.toThrow(BadRequestException);
  });

  it('validates every item, not just the first', async () => {
    const dto = {
      supplierId: 'supplier-1',
      items: [
        { productId: 'product-1', locationId: 'location-1', quantity: 1, unitPrice: 1 },
        { productId: 'product-2', locationId: 'location-1', quantity: 1, unitPrice: 1 },
      ],
    };
    repository.findProductRequiresBatch.mockResolvedValueOnce(false).mockResolvedValueOnce(null);

    await expect(useCase.execute(dto, 'user-1')).rejects.toThrow(BadRequestException);
    expect(repository.registerPurchase).not.toHaveBeenCalled();
  });
});
