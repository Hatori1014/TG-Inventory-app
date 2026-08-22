import { ConflictException, NotFoundException } from '@nestjs/common';
import { DeleteRoleUseCase } from './delete-role.use-case';
import { RoleRepository } from '../../domain/role.repository.interface';
import { Role } from '../../domain/role.entity';
import { ReassignUsersRoleUseCase } from '../../../users/application/use-cases/reassign-users-role.use-case';

describe('DeleteRoleUseCase', () => {
  let useCase: DeleteRoleUseCase;
  let roleRepository: jest.Mocked<RoleRepository>;
  let reassignUsersRoleUseCase: jest.Mocked<ReassignUsersRoleUseCase>;

  const comprador = new Role('role-comprador', 'Comprador', null, [], false);
  const solicitante = new Role('role-default', 'Solicitante', null, [], true);

  beforeEach(() => {
    roleRepository = {
      findAllPaginated: jest.fn(),
      findById: jest.fn(),
      findDefault: jest.fn(),
      create: jest.fn(),
      replacePermissions: jest.fn(),
      softDelete: jest.fn(),
    } as unknown as jest.Mocked<RoleRepository>;
    reassignUsersRoleUseCase = { execute: jest.fn() } as unknown as jest.Mocked<ReassignUsersRoleUseCase>;
    useCase = new DeleteRoleUseCase(roleRepository, reassignUsersRoleUseCase);
  });

  it('throws NotFoundException when the role does not exist', async () => {
    roleRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('missing')).rejects.toThrow(NotFoundException);
    expect(reassignUsersRoleUseCase.execute).not.toHaveBeenCalled();
  });

  it('refuses to delete the default role', async () => {
    roleRepository.findById.mockResolvedValue(solicitante);

    await expect(useCase.execute('role-default')).rejects.toThrow(ConflictException);
    expect(reassignUsersRoleUseCase.execute).not.toHaveBeenCalled();
    expect(roleRepository.softDelete).not.toHaveBeenCalled();
  });

  it('throws when no default role is configured to reassign users to', async () => {
    roleRepository.findById.mockResolvedValue(comprador);
    roleRepository.findDefault.mockResolvedValue(null);

    await expect(useCase.execute('role-comprador')).rejects.toThrow(ConflictException);
    expect(roleRepository.softDelete).not.toHaveBeenCalled();
  });

  it('reassigns every user on the role to the default role, then soft-deletes it', async () => {
    roleRepository.findById.mockResolvedValue(comprador);
    roleRepository.findDefault.mockResolvedValue(solicitante);
    reassignUsersRoleUseCase.execute.mockResolvedValue(3);

    const result = await useCase.execute('role-comprador');

    expect(reassignUsersRoleUseCase.execute).toHaveBeenCalledWith('role-comprador', 'role-default');
    expect(roleRepository.softDelete).toHaveBeenCalledWith('role-comprador');
    expect(result).toEqual({ reassignedUsers: 3 });
  });

  it('reassigns before soft-deleting (order matters: a crash before reassignment must not orphan users)', async () => {
    roleRepository.findById.mockResolvedValue(comprador);
    roleRepository.findDefault.mockResolvedValue(solicitante);
    const callOrder: string[] = [];
    reassignUsersRoleUseCase.execute.mockImplementation(async () => {
      callOrder.push('reassign');
      return 0;
    });
    roleRepository.softDelete.mockImplementation(async () => {
      callOrder.push('softDelete');
    });

    await useCase.execute('role-comprador');

    expect(callOrder).toEqual(['reassign', 'softDelete']);
  });
});
