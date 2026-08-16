import { BadRequestException } from '@nestjs/common';
import { CreateBatchUseCase } from './create-batch.use-case';
import { BatchPrismaRepository } from '../../infrastructure/batch.prisma.repository';
import { InventoryPrismaRepository } from '../../infrastructure/inventory.prisma.repository';

describe('CreateBatchUseCase', () => {
  let useCase: CreateBatchUseCase;
  let batchRepository: jest.Mocked<BatchPrismaRepository>;
  let inventoryRepository: jest.Mocked<InventoryPrismaRepository>;

  const baseDto = { productId: 'p1', batchNumber: 'LOT-1' };

  beforeEach(() => {
    batchRepository = {
      create: jest.fn(),
      findByProductPaginated: jest.fn(),
    } as unknown as jest.Mocked<BatchPrismaRepository>;
    inventoryRepository = {
      findProductRequiresBatch: jest.fn(),
    } as unknown as jest.Mocked<InventoryPrismaRepository>;
    useCase = new CreateBatchUseCase(batchRepository, inventoryRepository);
  });

  it('creates a batch for a product that requires batch tracking', async () => {
    inventoryRepository.findProductRequiresBatch.mockResolvedValue(true);
    batchRepository.create.mockResolvedValue({
      id: 'b1',
      productId: 'p1',
      batchNumber: 'LOT-1',
      expiresAt: null,
      receivedAt: new Date('2026-08-16T00:00:00Z'),
    } as any);

    const result = await useCase.execute(baseDto);

    expect(batchRepository.create).toHaveBeenCalledWith({
      productId: 'p1',
      batchNumber: 'LOT-1',
      expiresAt: undefined,
      receivedAt: undefined,
    });
    expect(result.id).toBe('b1');
  });

  it('throws BadRequestException when productId does not exist', async () => {
    inventoryRepository.findProductRequiresBatch.mockResolvedValue(null);

    await expect(useCase.execute(baseDto)).rejects.toThrow(BadRequestException);
    expect(batchRepository.create).not.toHaveBeenCalled();
  });

  it('throws BadRequestException when the product does not require batch tracking', async () => {
    inventoryRepository.findProductRequiresBatch.mockResolvedValue(false);

    await expect(useCase.execute(baseDto)).rejects.toThrow(BadRequestException);
    expect(batchRepository.create).not.toHaveBeenCalled();
  });
});
