import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ROLE_REPOSITORY, RoleRepository } from '../../domain/role.repository.interface';
import {
  PERMISSION_REPOSITORY,
  PermissionRepository,
} from '../../domain/permission.repository.interface';
import { RoleResponseDto } from '../../dto/role-response.dto';
import { toRoleResponseDto } from '../role-response.mapper';
// HU-23, at the user's explicit request: same ADR-18 pattern, AuditModule.
import { RecordAuditEventUseCase } from '../../../audit/application/use-cases/record-audit-event.use-case';

@Injectable()
export class UpdateRolePermissionsUseCase {
  constructor(
    @Inject(ROLE_REPOSITORY) private readonly roleRepository: RoleRepository,
    @Inject(PERMISSION_REPOSITORY) private readonly permissionRepository: PermissionRepository,
    private readonly recordAuditEvent: RecordAuditEventUseCase,
  ) {}

  async execute(roleId: string, permissionIds: string[], actorId: string): Promise<RoleResponseDto> {
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
    await this.recordAuditEvent.execute({
      userId: actorId,
      action: 'role.permissions.update',
      entity: 'Role',
      entityId: roleId,
    });
    return toRoleResponseDto(updated);
  }
}
