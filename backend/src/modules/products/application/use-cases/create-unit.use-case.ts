import { ConflictException, Injectable } from '@nestjs/common';
import { UnitPrismaRepository } from '../../infrastructure/unit.prisma.repository';
import { CreateUnitDto } from '../../dto/create-unit.dto';
import { UnitResponseDto } from '../../dto/unit-response.dto';
import { toUnitResponseDto } from '../unit-response.mapper';
import { isUniqueConstraintViolation } from '../../../../common/utils/prisma-error.util';

@Injectable()
export class CreateUnitUseCase {
  constructor(private readonly unitRepository: UnitPrismaRepository) {}

  async execute(dto: CreateUnitDto): Promise<UnitResponseDto> {
    try {
      const unit = await this.unitRepository.create(dto.name);
      return toUnitResponseDto(unit);
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new ConflictException(`A unit named "${dto.name}" already exists`);
      }
      throw error;
    }
  }
}
