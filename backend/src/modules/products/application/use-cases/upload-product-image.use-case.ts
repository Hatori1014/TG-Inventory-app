import { randomUUID } from 'crypto';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ProductPrismaRepository } from '../../infrastructure/product.prisma.repository';
import { ProductResponseDto } from '../../dto/product-response.dto';
import { toProductResponseDto } from '../product-response.mapper';
import { validateUploadedImage } from '../../../../common/utils/validate-uploaded-image.util';
import { processUploadedImage } from '../../../../common/utils/process-uploaded-image.util';
import { R2StorageService } from '../../../../storage/r2-storage.service';

// HU-26/27 — POST /products/:id/image. Order matters: validate the real
// content (HU-27, magic bytes) before doing anything else with the file —
// sharp never even touches a buffer that didn't pass that check.
@Injectable()
export class UploadProductImageUseCase {
  private readonly logger = new Logger(UploadProductImageUseCase.name);

  constructor(
    private readonly productRepository: ProductPrismaRepository,
    private readonly storage: R2StorageService,
  ) {}

  async execute(productId: string, fileBuffer: Buffer): Promise<ProductResponseDto> {
    const product = await this.productRepository.findById(productId);
    if (!product) {
      throw new NotFoundException(`Product ${productId} not found`);
    }

    await validateUploadedImage(fileBuffer);
    const { buffer: processed, contentType } = await processUploadedImage(fileBuffer);

    const key = `products/${productId}/${randomUUID()}.webp`;
    await this.storage.upload(key, processed, contentType);

    const previousKey = product.imageUrl;
    const updated = await this.productRepository.update(productId, { imageUrl: key });

    if (previousKey) {
      // At the user's explicit request: replacing an image deletes the
      // old one from R2 instead of leaving it orphaned. Best-effort —
      // the new image already succeeded and is what the product now
      // points to, so a delete failure here must never fail the request.
      this.storage.delete(previousKey).catch((error: unknown) => {
        this.logger.warn(`Failed to delete previous image ${previousKey}: ${String(error)}`);
      });
    }

    return toProductResponseDto(updated);
  }
}
