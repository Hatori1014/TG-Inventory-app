import { Test } from '@nestjs/testing';
import { RolesController } from './roles.controller';
import { CreateRoleUseCase } from './application/use-cases/create-role.use-case';
import { ListRolesUseCase } from './application/use-cases/list-roles.use-case';
import { UpdateRolePermissionsUseCase } from './application/use-cases/update-role-permissions.use-case';
import { DeleteRoleUseCase } from './application/use-cases/delete-role.use-case';

describe('RolesController', () => {
  let controller: RolesController;
  let createRoleUseCase: jest.Mocked<CreateRoleUseCase>;
  let listRolesUseCase: jest.Mocked<ListRolesUseCase>;
  let updateRolePermissionsUseCase: jest.Mocked<UpdateRolePermissionsUseCase>;
  let deleteRoleUseCase: jest.Mocked<DeleteRoleUseCase>;

  beforeEach(async () => {
    createRoleUseCase = { execute: jest.fn() } as unknown as jest.Mocked<CreateRoleUseCase>;
    listRolesUseCase = { execute: jest.fn() } as unknown as jest.Mocked<ListRolesUseCase>;
    updateRolePermissionsUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<UpdateRolePermissionsUseCase>;
    deleteRoleUseCase = { execute: jest.fn() } as unknown as jest.Mocked<DeleteRoleUseCase>;

    const moduleRef = await Test.createTestingModule({
      controllers: [RolesController],
      providers: [
        { provide: CreateRoleUseCase, useValue: createRoleUseCase },
        { provide: ListRolesUseCase, useValue: listRolesUseCase },
        { provide: UpdateRolePermissionsUseCase, useValue: updateRolePermissionsUseCase },
        { provide: DeleteRoleUseCase, useValue: deleteRoleUseCase },
      ],
    }).compile();

    controller = moduleRef.get(RolesController);
  });

  const actor = { id: 'actor-1', email: 'admin@tg-group.local', name: 'Admin', role: 'Administrador' };

  it('list() delegates to ListRolesUseCase with the query', async () => {
    const expected = { items: [], total: 0, page: 1, pageSize: 20 };
    listRolesUseCase.execute.mockResolvedValue(expected);

    const query = { page: 1, pageSize: 20 };
    const result = await controller.list(query);

    expect(listRolesUseCase.execute).toHaveBeenCalledWith(query);
    expect(result).toBe(expected);
  });

  it('create() delegates to CreateRoleUseCase with the DTO and the acting user', async () => {
    const expected = { id: '1', name: 'Comprador', description: null, permissions: [], isDefault: false };
    createRoleUseCase.execute.mockResolvedValue(expected);

    const dto = { name: 'Comprador' };
    const result = await controller.create(dto, actor);

    expect(createRoleUseCase.execute).toHaveBeenCalledWith(dto, actor.id);
    expect(result).toBe(expected);
  });

  it('updatePermissions() delegates to UpdateRolePermissionsUseCase with id, permissionIds, and the acting user', async () => {
    const expected = { id: '1', name: 'Comprador', description: null, permissions: [], isDefault: false };
    updateRolePermissionsUseCase.execute.mockResolvedValue(expected);

    const result = await controller.updatePermissions('1', { permissionIds: ['p1', 'p2'] }, actor);

    expect(updateRolePermissionsUseCase.execute).toHaveBeenCalledWith('1', ['p1', 'p2'], actor.id);
    expect(result).toBe(expected);
  });

  it('delete() delegates to DeleteRoleUseCase with the id and the acting user', async () => {
    const expected = { reassignedUsers: 2 };
    deleteRoleUseCase.execute.mockResolvedValue(expected);

    const result = await controller.delete('role-1', actor);

    expect(deleteRoleUseCase.execute).toHaveBeenCalledWith('role-1', actor.id);
    expect(result).toBe(expected);
  });
});
