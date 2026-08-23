import { BadRequestException, NotFoundException } from '@nestjs/common';
import * as sharp from 'sharp';
import { UploadProductImageUseCase } from './upload-product-image.use-case';
import { ProductPrismaRepository } from '../../infrastructure/product.prisma.repository';
import { R2StorageService } from '../../../../storage/r2-storage.service';

async function makeValidImageBuffer(): Promise<Buffer> {
  return sharp({ create: { width: 100, height: 100, channels: 3, background: { r: 1, g: 2, b: 3 } } })
    .png()
    .toBuffer();
}

describe('UploadProductImageUseCase', () => {
  let useCase: UploadProductImageUseCase;
  let productRepository: jest.Mocked<ProductPrismaRepository>;
  let storage: jest.Mocked<R2StorageService>;

  const existingProduct = {
    id: 'product-1',
    name: 'Arroz',
    description: null,
    unitId: 'unit-1',
    unit: { id: 'unit-1', name: 'Kg', status: 'active' as const },
    categoryId: null,
    category: null,
    requiresBatch: false,
    imageUrl: null,
    status: 'active' as const,
  };

  beforeEach(() => {
    productRepository = {
      findAllPaginated: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<ProductPrismaRepository>;
    storage = {
      upload: jest.fn(),
      get: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<R2StorageService>;
    useCase = new UploadProductImageUseCase(productRepository, storage);
  });

  it('throws NotFoundException when the product does not exist', async () => {
    productRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('missing', await makeValidImageBuffer())).rejects.toThrow(
      NotFoundException,
    );
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it('rejects a file whose real content is not an image (HU-27)', async () => {
    productRepository.findById.mockResolvedValue(existingProduct as never);

    await expect(useCase.execute('product-1', Buffer.from('not an image'))).rejects.toThrow(
      BadRequestException,
    );
    expect(storage.upload).not.toHaveBeenCalled();
    expect(productRepository.update).not.toHaveBeenCalled();
  });

  it('processes, uploads, and links the image to the product', async () => {
    productRepository.findById.mockResolvedValue(existingProduct as never);
    productRepository.update.mockResolvedValue({ ...existingProduct, imageUrl: 'products/product-1/x.webp' } as never);

    const result = await useCase.execute('product-1', await makeValidImageBuffer());

    expect(storage.upload).toHaveBeenCalledTimes(1);
    const [key, buffer, contentType] = storage.upload.mock.calls[0];
    expect(key).toMatch(/^products\/product-1\/[0-9a-f-]+\.webp$/);
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(contentType).toBe('image/webp');
    expect(productRepository.update).toHaveBeenCalledWith('product-1', { imageUrl: key });
    expect(storage.delete).not.toHaveBeenCalled();
    expect(result.imageUrl).toBe('products/product-1/x.webp');
  });

  it('deletes the previous image from R2 when replacing an existing one', async () => {
    const withImage = { ...existingProduct, imageUrl: 'products/product-1/old.webp' };
    productRepository.findById.mockResolvedValue(withImage as never);
    productRepository.update.mockResolvedValue(withImage as never);
    storage.delete.mockResolvedValue(undefined);

    await useCase.execute('product-1', await makeValidImageBuffer());

    expect(storage.delete).toHaveBeenCalledWith('products/product-1/old.webp');
  });

  it('does not fail the upload if deleting the previous image fails', async () => {
    const withImage = { ...existingProduct, imageUrl: 'products/product-1/old.webp' };
    productRepository.findById.mockResolvedValue(withImage as never);
    productRepository.update.mockResolvedValue(withImage as never);
    storage.delete.mockRejectedValue(new Error('R2 unreachable'));

    await expect(useCase.execute('product-1', await makeValidImageBuffer())).resolves.toBeDefined();
  });
});
