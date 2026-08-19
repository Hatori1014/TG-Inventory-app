import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PersonTypePrismaRepository } from '../../infrastructure/person-type.prisma.repository';
import { UpdatePersonTypeDto } from '../../dto/update-person-type.dto';
import { PersonTypeResponseDto } from '../../dto/person-type-response.dto';
import { toPersonTypeResponseDto } from '../person-type-response.mapper';
import { isUniqueConstraintViolation } from '../../../../common/utils/prisma-error.util';

@Injectable()
export class UpdatePersonTypeUseCase {
  constructor(private readonly personTypeRepository: PersonTypePrismaRepository) {}

  async execute(id: string, dto: UpdatePersonTypeDto): Promise<PersonTypeResponseDto> {
    if (dto.name === undefined && dto.status === undefined) {
      throw new BadRequestException('At least one field must be provided');
    }

    const existing = await this.personTypeRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Person type ${id} not found`);
    }

    try {
      const updated = await this.personTypeRepository.update(id, dto);
      return toPersonTypeResponseDto(updated);
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new ConflictException(`A person type named "${dto.name}" already exists`);
      }
      throw error;
    }
  }
}
