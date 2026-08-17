import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { UnitPrismaRepository } from '../../infrastructure/unit.prisma.repository';
import { UpdateUnitDto } from '../../dto/update-unit.dto';
import { UnitResponseDto } from '../../dto/unit-response.dto';
import { toUnitResponseDto } from '../unit-response.mapper';
import { isUniqueConstraintViolation } from '../../../../common/utils/prisma-error.util';

@Injectable()
export class UpdateUnitUseCase {
  constructor(private readonly unitRepository: UnitPrismaRepository) {}

  async execute(id: string, dto: UpdateUnitDto): Promise<UnitResponseDto> {
    if (dto.name === undefined && dto.status === undefined) {
      throw new BadRequestException('At least one field must be provided');
    }

    const existing = await this.unitRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Unit ${id} not found`);
    }

    try {
      const updated = await this.unitRepository.update(id, dto);
      return toUnitResponseDto(updated);
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new ConflictException(`A unit named "${dto.name}" already exists`);
      }
      throw error;
    }
  }
}
