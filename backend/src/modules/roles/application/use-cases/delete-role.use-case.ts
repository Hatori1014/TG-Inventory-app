import { ConflictException, Injectable, Inject, NotFoundException } from '@nestjs/common';
import { ROLE_REPOSITORY, RoleRepository } from '../../domain/role.repository.interface';
// Legitimate cross-module DI (ADR-18): RolesModule imports UsersModule and
// injects its exported use-case instead of writing to `user` directly.
import { ReassignUsersRoleUseCase } from '../../../users/application/use-cases/reassign-users-role.use-case';
// HU-23, at the user's explicit request: same ADR-18 pattern, AuditModule.
import { RecordAuditEventUseCase } from '../../../audit/application/use-cases/record-audit-event.use-case';

export interface DeleteRoleResult {
  reassignedUsers: number;
}

// Default-role feature, at the user's explicit request: deleting a role is
// a logical delete (ADR-22) that first moves every user holding it onto
// the default role, so no user is ever left with a dangling/nonexistent
// role. The default role itself can never be deleted — DeleteRoleUseCase
// is its only real protection (the DB has no way to express "this FK
// target may not be soft-deleted").
//
// The reassignment and the soft-delete are two separate writes, not one
// transaction spanning both modules' repositories — same accepted-gap
// reasoning as HU-17's IntegrateRequestUseCase (RegisterPurchaseUseCase
// call followed by closeAfterIntegration): a crash in between leaves the
// role active with zero users on it, which is harmless and safe to retry,
// not a state that loses or corrupts data.
@Injectable()
export class DeleteRoleUseCase {
  constructor(
    @Inject(ROLE_REPOSITORY) private readonly roleRepository: RoleRepository,
    private readonly reassignUsersRoleUseCase: ReassignUsersRoleUseCase,
    private readonly recordAuditEvent: RecordAuditEventUseCase,
  ) {}

  async execute(id: string, actorId: string): Promise<DeleteRoleResult> {
    const role = await this.roleRepository.findById(id);
    if (!role) {
      throw new NotFoundException(`Role ${id} not found`);
    }
    if (role.getIsDefault()) {
      throw new ConflictException('The default role cannot be deleted');
    }

    const defaultRole = await this.roleRepository.findDefault();
    if (!defaultRole) {
      throw new ConflictException('No default role is configured — cannot reassign its users');
    }

    const reassignedUsers = await this.reassignUsersRoleUseCase.execute(id, defaultRole.getId());
    await this.roleRepository.softDelete(id);
    await this.recordAuditEvent.execute({
      userId: actorId,
      action: 'role.delete',
      entity: 'Role',
      entityId: id,
    });
    return { reassignedUsers };
  }
}
