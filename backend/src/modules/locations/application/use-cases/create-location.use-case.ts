import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { LocationPrismaRepository } from '../../infrastructure/location.prisma.repository';
import { CreateLocationDto } from '../../dto/create-location.dto';
import { LocationResponseDto } from '../../dto/location-response.dto';
import { toLocationResponseDto } from '../location-response.mapper';
import { isForeignKeyViolation, isUniqueConstraintViolation } from '../../../../common/utils/prisma-error.util';

@Injectable()
export class CreateLocationUseCase {
  constructor(private readonly locationRepository: LocationPrismaRepository) {}

  async execute(dto: CreateLocationDto): Promise<LocationResponseDto> {
    const parentId = dto.parentId ?? null;
    const existing = await this.locationRepository.findByParentAndName(parentId, dto.name);
    if (existing) {
      throw new ConflictException(`A location named "${dto.name}" already exists under that parent`);
    }

    try {
      const location = await this.locationRepository.create({ name: dto.name, parentId: dto.parentId });
      return toLocationResponseDto(location);
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
