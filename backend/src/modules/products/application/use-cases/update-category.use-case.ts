import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CategoryPrismaRepository } from '../../infrastructure/category.prisma.repository';
import { UpdateCategoryDto } from '../../dto/update-category.dto';
import { CategoryResponseDto } from '../../dto/category-response.dto';
import { toCategoryResponseDto } from '../category-response.mapper';
import { isUniqueConstraintViolation } from '../../../../common/utils/prisma-error.util';

@Injectable()
export class UpdateCategoryUseCase {
  constructor(private readonly categoryRepository: CategoryPrismaRepository) {}

  async execute(id: string, dto: UpdateCategoryDto): Promise<CategoryResponseDto> {
    if (dto.name === undefined && dto.status === undefined) {
      throw new BadRequestException('At least one field must be provided');
    }

    const existing = await this.categoryRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Category ${id} not found`);
    }

    try {
      const updated = await this.categoryRepository.update(id, dto);
      return toCategoryResponseDto(updated);
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new ConflictException(`A category named "${dto.name}" already exists`);
      }
      throw error;
    }
  }
}
