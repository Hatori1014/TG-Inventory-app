import { ConflictException, Injectable } from '@nestjs/common';
import { CategoryPrismaRepository } from '../../infrastructure/category.prisma.repository';
import { CreateCategoryDto } from '../../dto/create-category.dto';
import { CategoryResponseDto } from '../../dto/category-response.dto';
import { toCategoryResponseDto } from '../category-response.mapper';
import { isUniqueConstraintViolation } from '../../../../common/utils/prisma-error.util';

@Injectable()
export class CreateCategoryUseCase {
  constructor(private readonly categoryRepository: CategoryPrismaRepository) {}

  async execute(dto: CreateCategoryDto): Promise<CategoryResponseDto> {
    try {
      const category = await this.categoryRepository.create(dto.name);
      return toCategoryResponseDto(category);
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new ConflictException(`A category named "${dto.name}" already exists`);
      }
      throw error;
    }
  }
}
