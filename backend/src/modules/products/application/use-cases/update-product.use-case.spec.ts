import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UpdateProductUseCase } from './update-product.use-case';
import { ProductPrismaRepository } from '../../infrastructure/product.prisma.repository';

describe('UpdateProductUseCase', () => {
  let useCase: UpdateProductUseCase;
  let repository: jest.Mocked<ProductPrismaRepository>;

  const unit = { id: 'unit-1', name: 'Kilogramo', status: 'active' as const };
  const existingProduct = {
    id: '1',
    name: 'Arroz',
    description: null,
    unitId: 'unit-1',
    unit,
    categoryId: null,
    category: null,
    requiresBatch: false,
    imageUrl: null,
    status: 'active' as const,
  };

  beforeEach(() => {
    repository = {
      findAllPaginated: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<ProductPrismaRepository>;
    useCase = new UpdateProductUseCase(repository);
  });

  it('throws BadRequestException when no field is provided', async () => {
    await expect(useCase.execute('1', {})).rejects.toThrow(BadRequestException);
    expect(repository.findById).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when the product does not exist', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(useCase.execute('missing', { status: 'discontinued' })).rejects.toThrow(
      NotFoundException,
    );
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('throws BadRequestException when unitId or categoryId does not exist (P2003)', async () => {
    repository.findById.mockResolvedValue(existingProduct);
    repository.update.mockRejectedValue({ code: 'P2003' });

    await expect(useCase.execute('1', { unitId: 'missing' })).rejects.toThrow(BadRequestException);
  });

  it('updates the product and returns it mapped to a DTO (e.g. discontinuing it)', async () => {
    repository.findById.mockResolvedValue(existingProduct);
    repository.update.mockResolvedValue({ ...existingProduct, status: 'discontinued' });

    const result = await useCase.execute('1', { status: 'discontinued' });

    expect(repository.update).toHaveBeenCalledWith('1', { status: 'discontinued' });
    expect(result.status).toBe('discontinued');
  });

  it('updates requiresBatch on its own (HU-09, deferred by HU-28)', async () => {
    repository.findById.mockResolvedValue(existingProduct);
    repository.update.mockResolvedValue({ ...existingProduct, requiresBatch: true });

    const result = await useCase.execute('1', { requiresBatch: true });

    expect(repository.update).toHaveBeenCalledWith('1', { requiresBatch: true });
    expect(result.requiresBatch).toBe(true);
  });
});
