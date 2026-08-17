import { Category } from '@prisma/client';
import { CategoryResponseDto } from '../dto/category-response.dto';

export function toCategoryResponseDto(category: Category): CategoryResponseDto {
  return {
    id: category.id,
    name: category.name,
    status: category.status,
  };
}
