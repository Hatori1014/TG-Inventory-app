import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ROLE_REPOSITORY, RoleRepository } from '../../domain/role.repository.interface';
import {
  PERMISSION_REPOSITORY,
  PermissionRepository,
} from '../../domain/permission.repository.interface';
import { RoleResponseDto } from '../../dto/role-response.dto';
import { toRoleResponseDto } from '../role-response.mapper';

@Injectable()
export class UpdateRolePermissionsUseCase {
  constructor(
    @Inject(ROLE_REPOSITORY) private readonly roleRepository: RoleRepository,
    @Inject(PERMISSION_REPOSITORY) private readonly permissionRepository: PermissionRepository,
  ) {}

  async execute(roleId: string, permissionIds: string[]): Promise<RoleResponseDto> {
    const role = await this.roleRepository.findById(roleId);
    if (!role) {
      throw new NotFoundException(`Role ${roleId} not found`);
    }

    const uniqueIds = new Set(permissionIds);
    if (uniqueIds.size !== permissionIds.length) {
      throw new BadRequestException('permissionIds must not contain duplicates');
    }

    const found = await this.permissionRepository.findManyByIds(permissionIds);
    if (found.length !== permissionIds.length) {
      throw new BadRequestException('One or more permissionIds do not exist');
    }

    const updated = await this.roleRepository.replacePermissions(roleId, permissionIds);
    return toRoleResponseDto(updated);
  }
}
