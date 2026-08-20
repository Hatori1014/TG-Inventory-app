import { NotFoundException } from '@nestjs/common';
import { UpdateMinimumStockUseCase } from './update-minimum-stock.use-case';
import { MinimumStockPrismaRepository } from '../../infrastructure/minimum-stock.prisma.repository';

describe('UpdateMinimumStockUseCase', () => {
  let useCase: UpdateMinimumStockUseCase;
  let repository: jest.Mocked<MinimumStockPrismaRepository>;

  beforeEach(() => {
    repository = {
      findById: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<MinimumStockPrismaRepository>;
    useCase = new UpdateMinimumStockUseCase(repository);
  });

  it('throws NotFoundException when the minimum stock record does not exist', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(useCase.execute('missing', { minimumQuantity: 5 })).rejects.toThrow(NotFoundException);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('updates the minimum quantity of an existing record', async () => {
    repository.findById.mockResolvedValue({ id: 'min-1' } as never);
    repository.update.mockResolvedValue({
      id: 'min-1',
      productId: 'product-1',
      product: { id: 'product-1', name: 'Arroz' },
      minimumQuantity: 35,
    } as never);

    const result = await useCase.execute('min-1', { minimumQuantity: 35 });

    expect(repository.update).toHaveBeenCalledWith('min-1', 35);
    expect(result.minimumQuantity).toBe(35);
  });
});
