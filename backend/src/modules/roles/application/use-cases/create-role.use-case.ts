import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { ROLE_REPOSITORY, RoleRepository } from '../../domain/role.repository.interface';
import { CreateRoleDto } from '../../dto/create-role.dto';
import { RoleResponseDto } from '../../dto/role-response.dto';
import { toRoleResponseDto } from '../role-response.mapper';
import { isUniqueConstraintViolation } from '../../../../common/utils/prisma-error.util';

@Injectable()
export class CreateRoleUseCase {
  constructor(@Inject(ROLE_REPOSITORY) private readonly roleRepository: RoleRepository) {}

  async execute(dto: CreateRoleDto): Promise<RoleResponseDto> {
    try {
      const role = await this.roleRepository.create(dto.name, dto.description);
      return toRoleResponseDto(role);
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new ConflictException(`A role named "${dto.name}" already exists`);
      }
      throw error;
    }
  }
}
