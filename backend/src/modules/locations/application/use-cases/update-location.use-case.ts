import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { LocationPrismaRepository } from '../../infrastructure/location.prisma.repository';
import { UpdateLocationDto } from '../../dto/update-location.dto';
import { LocationResponseDto } from '../../dto/location-response.dto';
import { toLocationResponseDto } from '../location-response.mapper';
import { isForeignKeyViolation, isUniqueConstraintViolation } from '../../../../common/utils/prisma-error.util';

@Injectable()
export class UpdateLocationUseCase {
  constructor(private readonly locationRepository: LocationPrismaRepository) {}

  async execute(id: string, dto: UpdateLocationDto): Promise<LocationResponseDto> {
    if (dto.name === undefined && dto.parentId === undefined && dto.status === undefined) {
      throw new BadRequestException('At least one field must be provided');
    }

    const existing = await this.locationRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Location ${id} not found`);
    }

    if (dto.parentId === id) {
      throw new BadRequestException('A location cannot be its own parent');
    }

    if (dto.name !== undefined || dto.parentId !== undefined) {
      const effectiveParentId = dto.parentId !== undefined ? dto.parentId : existing.parentId;
      const effectiveName = dto.name ?? existing.name;
      const duplicate = await this.locationRepository.findByParentAndName(effectiveParentId, effectiveName);
      if (duplicate && duplicate.id !== id) {
        throw new ConflictException(`A location named "${effectiveName}" already exists under that parent`);
      }
    }

    try {
      const updated = await this.locationRepository.update(id, dto);
      return toLocationResponseDto(updated);
    } catch (error) {
      if (isForeignKeyViolation(error)) {
        throw new BadRequestException('parentId does not exist');
      }
      if (isUniqueConstraintViolation(error)) {
        throw new ConflictException(`A location named "${dto.name}" already exists under that parent`);
      }
      throw error;
    }
  }
}
