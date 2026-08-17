import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ProductPrismaRepository } from '../../infrastructure/product.prisma.repository';
import { UpdateProductDto } from '../../dto/update-product.dto';
import { ProductResponseDto } from '../../dto/product-response.dto';
import { toProductResponseDto } from '../product-response.mapper';
import { isForeignKeyViolation } from '../../../../common/utils/prisma-error.util';

@Injectable()
export class UpdateProductUseCase {
  constructor(private readonly productRepository: ProductPrismaRepository) {}

  async execute(id: string, dto: UpdateProductDto): Promise<ProductResponseDto> {
    if (
      dto.name === undefined &&
      dto.description === undefined &&
      dto.unitId === undefined &&
      dto.categoryId === undefined &&
      dto.status === undefined &&
      dto.requiresBatch === undefined
    ) {
      throw new BadRequestException('At least one field must be provided');
    }

    const existing = await this.productRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Product ${id} not found`);
    }

    try {
      const updated = await this.productRepository.update(id, dto);
      return toProductResponseDto(updated);
    } catch (error) {
      if (isForeignKeyViolation(error)) {
        throw new BadRequestException('unitId or categoryId does not exist');
      }
      throw error;
    }
  }
}
