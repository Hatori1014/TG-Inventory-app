import { Inject, Injectable } from '@nestjs/common';
import { USER_REPOSITORY, UserRepository } from '../../domain/user.repository.interface';

// Default-role feature — exported so RolesModule can reuse it from
// DeleteRoleUseCase via legitimate cross-module DI (ADR-18: a module
// cannot import another module's domain/infrastructure directly, but can
// call its exported use-case) instead of writing to `user` directly from
// the roles module.
@Injectable()
export class ReassignUsersRoleUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly userRepository: UserRepository) {}

  execute(fromRoleId: string, toRoleId: string): Promise<number> {
    return this.userRepository.reassignRole(fromRoleId, toRoleId);
  }
}
