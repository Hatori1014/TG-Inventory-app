import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UpdateRolePermissionsUseCase } from './update-role-permissions.use-case';
import { RoleRepository } from '../../domain/role.repository.interface';
import { PermissionRepository } from '../../domain/permission.repository.interface';
import { Role } from '../../domain/role.entity';
import { Permission } from '../../domain/permission.value-object';
import { RecordAuditEventUseCase } from '../../../audit/application/use-cases/record-audit-event.use-case';

describe('UpdateRolePermissionsUseCase', () => {
  let useCase: UpdateRolePermissionsUseCase;
  let roleRepository: jest.Mocked<RoleRepository>;
  let permissionRepository: jest.Mocked<PermissionRepository>;
  let recordAuditEvent: jest.Mocked<RecordAuditEventUseCase>;

  beforeEach(() => {
    roleRepository = {
      findAllPaginated: jest.fn(),
      findById: jest.fn(),
      findDefault: jest.fn(),
      create: jest.fn(),
      replacePermissions: jest.fn(),
      softDelete: jest.fn(),
    };
    permissionRepository = { findAllPaginated: jest.fn(), findManyByIds: jest.fn() };
    recordAuditEvent = { execute: jest.fn() } as unknown as jest.Mocked<RecordAuditEventUseCase>;
    useCase = new UpdateRolePermissionsUseCase(roleRepository, permissionRepository, recordAuditEvent);
  });

  it('throws NotFoundException when the role does not exist', async () => {
    roleRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('missing-role', ['p1'], 'actor-1')).rejects.toThrow(NotFoundException);
    expect(permissionRepository.findManyByIds).not.toHaveBeenCalled();
  });

  it('throws BadRequestException when a permissionId does not exist', async () => {
    roleRepository.findById.mockResolvedValue(new Role('1', 'Comprador', null, []));
    permissionRepository.findManyByIds.mockResolvedValue([new Permission('roles', 'read', 'p1')]);

    await expect(useCase.execute('1', ['p1', 'does-not-exist'], 'actor-1')).rejects.toThrow(BadRequestException);
    expect(roleRepository.replacePermissions).not.toHaveBeenCalled();
  });

  it('throws BadRequestException when permissionIds contains duplicates', async () => {
    roleRepository.findById.mockResolvedValue(new Role('1', 'Comprador', null, []));
    permissionRepository.findManyByIds.mockResolvedValue([new Permission('roles', 'read', 'p1')]);

    await expect(useCase.execute('1', ['p1', 'p1'], 'actor-1')).rejects.toThrow(BadRequestException);
  });

  it('replaces the permission set, audits it, and returns the updated role', async () => {
    roleRepository.findById.mockResolvedValue(new Role('1', 'Comprador', null, []));
    permissionRepository.findManyByIds.mockResolvedValue([
      new Permission('roles', 'read', 'p1'),
      new Permission('roles', 'create', 'p2'),
    ]);
    const updated = new Role('1', 'Comprador', null, [
      new Permission('roles', 'read', 'p1'),
      new Permission('roles', 'create', 'p2'),
    ]);
    roleRepository.replacePermissions.mockResolvedValue(updated);

    const result = await useCase.execute('1', ['p1', 'p2'], 'actor-1');

    expect(roleRepository.replacePermissions).toHaveBeenCalledWith('1', ['p1', 'p2']);
    expect(recordAuditEvent.execute).toHaveBeenCalledWith({
      userId: 'actor-1',
      action: 'role.permissions.update',
      entity: 'Role',
      entityId: '1',
    });
    expect(result.permissions).toEqual([
      { id: 'p1', module: 'roles', action: 'read' },
      { id: 'p2', module: 'roles', action: 'create' },
    ]);
  });
});
