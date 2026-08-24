import { Injectable, NotFoundException } from '@nestjs/common';
import { ProductPrismaRepository } from '../../infrastructure/product.prisma.repository';
import { R2StorageService, StoredObject } from '../../../../storage/r2-storage.service';

// GET /products/:id/image — the R2 bucket is private (the user's explicit
// choice), so this proxies the object through the backend instead of
// exposing a public R2 URL directly to the client.
@Injectable()
export class GetProductImageUseCase {
  constructor(
    private readonly productRepository: ProductPrismaRepository,
    private readonly storage: R2StorageService,
  ) {}

  async execute(productId: string): Promise<StoredObject> {
    const product = await this.productRepository.findById(productId);
    if (!product || !product.imageUrl) {
      throw new NotFoundException(`Product ${productId} has no image`);
    }
    return this.storage.get(product.imageUrl);
  }
}
