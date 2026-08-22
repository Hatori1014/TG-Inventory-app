import { BadRequestException, ConflictException } from '@nestjs/common';
import { CreateMinimumStockUseCase } from './create-minimum-stock.use-case';
import { MinimumStockPrismaRepository } from '../../infrastructure/minimum-stock.prisma.repository';

describe('CreateMinimumStockUseCase', () => {
  let useCase: CreateMinimumStockUseCase;
  let repository: jest.Mocked<MinimumStockPrismaRepository>;

  const minimumStock = {
    id: 'min-1',
    productId: 'product-1',
    product: { id: 'product-1', name: 'Arroz' },
    minimumQuantity: 10,
  };

  beforeEach(() => {
    repository = {
      findProductName: jest.fn(),
      findByProductId: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<MinimumStockPrismaRepository>;
    useCase = new CreateMinimumStockUseCase(repository);
  });

  it('throws BadRequestException when the product does not exist', async () => {
    repository.findProductName.mockResolvedValue(null);

    await expect(useCase.execute({ productId: 'missing', minimumQuantity: 10 })).rejects.toThrow(BadRequestException);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('throws ConflictException when the product already has a minimum defined', async () => {
    repository.findProductName.mockResolvedValue('Arroz');
    repository.findByProductId.mockResolvedValue(minimumStock as never);

    await expect(useCase.execute({ productId: 'product-1', minimumQuantity: 10 })).rejects.toThrow(ConflictException);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('creates a minimum for a product that does not have one yet', async () => {
    repository.findProductName.mockResolvedValue('Arroz');
    repository.findByProductId.mockResolvedValue(null);
    repository.create.mockResolvedValue(minimumStock as never);

    const result = await useCase.execute({ productId: 'product-1', minimumQuantity: 10 });

    expect(repository.create).toHaveBeenCalledWith({ productId: 'product-1', minimumQuantity: 10 });
    expect(result.productName).toBe('Arroz');
  });
});
