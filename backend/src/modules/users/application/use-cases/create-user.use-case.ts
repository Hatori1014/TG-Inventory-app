import { BadRequestException, ConflictException, Inject, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { USER_REPOSITORY, UserRepository } from '../../domain/user.repository.interface';
import { CreateUserDto } from '../../dto/create-user.dto';
import { UserResponseDto } from '../../dto/user-response.dto';
import { toUserResponseDto } from '../user-response.mapper';
import {
  isForeignKeyViolation,
  isUniqueConstraintViolation,
} from '../../../../common/utils/prisma-error.util';

@Injectable()
export class CreateUserUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly userRepository: UserRepository) {}

  async execute(dto: CreateUserDto): Promise<UserResponseDto> {
    const passwordHash = await bcrypt.hash(dto.password, 10);

    try {
      const user = await this.userRepository.create({
        name: dto.name,
        email: dto.email,
        passwordHash,
        roleId: dto.roleId,
      });
      return toUserResponseDto(user);
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
