import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { ROLE_REPOSITORY, RoleRepository } from '../../domain/role.repository.interface';
import { CreateRoleDto } from '../../dto/create-role.dto';
import { RoleResponseDto } from '../../dto/role-response.dto';
import { toRoleResponseDto } from '../role-response.mapper';
import { isUniqueConstraintViolation } from '../../../../common/utils/prisma-error.util';
// HU-23, at the user's explicit request: legitimate cross-module DI
// (ADR-18), same pattern HU-17 used for PurchasesModule/RequestsModule.
import { RecordAuditEventUseCase } from '../../../audit/application/use-cases/record-audit-event.use-case';

@Injectable()
export class CreateRoleUseCase {
  constructor(
    @Inject(ROLE_REPOSITORY) private readonly roleRepository: RoleRepository,
    private readonly recordAuditEvent: RecordAuditEventUseCase,
  ) {}

  async execute(dto: CreateRoleDto, actorId: string): Promise<RoleResponseDto> {
    try {
      const role = await this.roleRepository.create(dto.name, dto.description);
      await this.recordAuditEvent.execute({
        userId: actorId,
        action: 'role.create',
        entity: 'Role',
        entityId: role.getId(),
      });
      return toRoleResponseDto(role);
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new ConflictException(`A role named "${dto.name}" already exists`);
      }
      throw error;
    }
  }
}
