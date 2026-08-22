import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { USER_REPOSITORY, UserRepository } from '../../domain/user.repository.interface';
import { UpdateUserDto } from '../../dto/update-user.dto';
import { UserResponseDto } from '../../dto/user-response.dto';
import { toUserResponseDto } from '../user-response.mapper';
import {
  isForeignKeyViolation,
  isUniqueConstraintViolation,
} from '../../../../common/utils/prisma-error.util';

@Injectable()
export class UpdateUserUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly userRepository: UserRepository) {}

  async execute(id: string, dto: UpdateUserDto): Promise<UserResponseDto> {
    if (
      dto.name === undefined &&
      dto.email === undefined &&
      dto.roleId === undefined &&
      dto.status === undefined
    ) {
      throw new BadRequestException('At least one field must be provided');
    }

    const existing = await this.userRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`User ${id} not found`);
    }

    if (dto.roleId !== undefined && (await this.userRepository.findRoleStatus(dto.roleId)) === 'deleted') {
      throw new BadRequestException(`roleId "${dto.roleId}" refers to a deleted role`);
    }

    try {
      const updated = await this.userRepository.update(id, dto);
      return toUserResponseDto(updated);
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new ConflictException(`A user with email "${dto.email}" already exists`);
      }
      if (isForeignKeyViolation(error)) {
        throw new BadRequestException(`roleId "${dto.roleId}" does not exist`);
      }
      throw error;
    }
  }
}
