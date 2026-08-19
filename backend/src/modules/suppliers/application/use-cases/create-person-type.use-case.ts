import { ConflictException, Injectable } from '@nestjs/common';
import { PersonTypePrismaRepository } from '../../infrastructure/person-type.prisma.repository';
import { CreatePersonTypeDto } from '../../dto/create-person-type.dto';
import { PersonTypeResponseDto } from '../../dto/person-type-response.dto';
import { toPersonTypeResponseDto } from '../person-type-response.mapper';
import { isUniqueConstraintViolation } from '../../../../common/utils/prisma-error.util';

@Injectable()
export class CreatePersonTypeUseCase {
  constructor(private readonly personTypeRepository: PersonTypePrismaRepository) {}

  async execute(dto: CreatePersonTypeDto): Promise<PersonTypeResponseDto> {
    try {
      const personType = await this.personTypeRepository.create(dto.name);
      return toPersonTypeResponseDto(personType);
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new ConflictException(`A person type named "${dto.name}" already exists`);
      }
      throw error;
    }
  }
}
