import { BadRequestException, Injectable } from '@nestjs/common';
import { ProductPrismaRepository } from '../../infrastructure/product.prisma.repository';
import { CreateProductDto } from '../../dto/create-product.dto';
import { ProductResponseDto } from '../../dto/product-response.dto';
import { toProductResponseDto } from '../product-response.mapper';
import { isForeignKeyViolation } from '../../../../common/utils/prisma-error.util';

@Injectable()
export class CreateProductUseCase {
  constructor(private readonly productRepository: ProductPrismaRepository) {}

  async execute(dto: CreateProductDto): Promise<ProductResponseDto> {
    try {
      const product = await this.productRepository.create({
        name: dto.name,
        description: dto.description,
        unitId: dto.unitId,
        categoryId: dto.categoryId,
        requiresBatch: dto.requiresBatch,
      });
      return toProductResponseDto(product);
    } catch (error) {
      if (isForeignKeyViolation(error)) {
        throw new BadRequestException('unitId or categoryId does not exist');
      }
      throw error;
    }
  }
}
