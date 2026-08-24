import { NotFoundException } from '@nestjs/common';
import { GetProductImageUseCase } from './get-product-image.use-case';
import { ProductPrismaRepository } from '../../infrastructure/product.prisma.repository';
import { R2StorageService } from '../../../../storage/r2-storage.service';

describe('GetProductImageUseCase', () => {
  let useCase: GetProductImageUseCase;
  let productRepository: jest.Mocked<ProductPrismaRepository>;
  let storage: jest.Mocked<R2StorageService>;

  beforeEach(() => {
    productRepository = {
      findAllPaginated: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<ProductPrismaRepository>;
    storage = { upload: jest.fn(), get: jest.fn(), delete: jest.fn() } as unknown as jest.Mocked<R2StorageService>;
    useCase = new GetProductImageUseCase(productRepository, storage);
  });

  it('throws NotFoundException when the product does not exist', async () => {
    productRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('missing')).rejects.toThrow(NotFoundException);
    expect(storage.get).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when the product has no image', async () => {
    productRepository.findById.mockResolvedValue({ id: 'product-1', imageUrl: null } as never);

    await expect(useCase.execute('product-1')).rejects.toThrow(NotFoundException);
    expect(storage.get).not.toHaveBeenCalled();
  });

  it('fetches the image from R2 using the product image key', async () => {
    productRepository.findById.mockResolvedValue({
      id: 'product-1',
      imageUrl: 'products/product-1/x.webp',
    } as never);
    storage.get.mockResolvedValue({ body: Buffer.from('fake-webp'), contentType: 'image/webp' });

    const result = await useCase.execute('product-1');

    expect(storage.get).toHaveBeenCalledWith('products/product-1/x.webp');
    expect(result.contentType).toBe('image/webp');
  });
});
