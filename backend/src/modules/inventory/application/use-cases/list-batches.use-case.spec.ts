import { BadRequestException } from '@nestjs/common';
import { ListBatchesUseCase } from './list-batches.use-case';
import { BatchPrismaRepository } from '../../infrastructure/batch.prisma.repository';
import { InventoryPrismaRepository } from '../../infrastructure/inventory.prisma.repository';

describe('ListBatchesUseCase', () => {
  let useCase: ListBatchesUseCase;
  let batchRepository: jest.Mocked<BatchPrismaRepository>;
  let inventoryRepository: jest.Mocked<InventoryPrismaRepository>;

  beforeEach(() => {
    batchRepository = {
      create: jest.fn(),
      findByProductPaginated: jest.fn(),
    } as unknown as jest.Mocked<BatchPrismaRepository>;
    inventoryRepository = {
      findProductRequiresBatch: jest.fn(),
    } as unknown as jest.Mocked<InventoryPrismaRepository>;
    useCase = new ListBatchesUseCase(batchRepository, inventoryRepository);
  });

  it('returns a paginated, mapped list of batches for the product', async () => {
    inventoryRepository.findProductRequiresBatch.mockResolvedValue(true);
    batchRepository.findByProductPaginated.mockResolvedValue({
      items: [
        {
          id: 'b1',
          productId: 'p1',
          batchNumber: 'LOT-1',
          expiresAt: null,
          receivedAt: new Date('2026-08-16T00:00:00Z'),
        } as any,
      ],
      total: 1,
    });

    const result = await useCase.execute('p1', { page: 1, pageSize: 20 });

    expect(batchRepository.findByProductPaginated).toHaveBeenCalledWith('p1', 0, 20);
    expect(result.items[0].id).toBe('b1');
    expect(result.total).toBe(1);
  });

  it('throws BadRequestException when productId does not exist', async () => {
    inventoryRepository.findProductRequiresBatch.mockResolvedValue(null);

    await expect(useCase.execute('missing', { page: 1, pageSize: 20 })).rejects.toThrow(BadRequestException);
    expect(batchRepository.findByProductPaginated).not.toHaveBeenCalled();
  });
});
