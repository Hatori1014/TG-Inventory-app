import { Prisma } from '@prisma/client';
import { ProductResponseDto } from '../dto/product-response.dto';
import { toCategoryResponseDto } from './category-response.mapper';
import { toUnitResponseDto } from './unit-response.mapper';

export const productWithRelations = Prisma.validator<Prisma.ProductDefaultArgs>()({
  include: { unit: true, category: true },
});
export type ProductWithRelations = Prisma.ProductGetPayload<typeof productWithRelations>;

export function toProductResponseDto(product: ProductWithRelations): ProductResponseDto {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    unit: toUnitResponseDto(product.unit),
    category: product.category ? toCategoryResponseDto(product.category) : null,
    requiresBatch: product.requiresBatch,
    imageUrl: product.imageUrl,
    status: product.status,
  };
}
