import { Test } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { CreateUserUseCase } from './application/use-cases/create-user.use-case';
import { ListUsersUseCase } from './application/use-cases/list-users.use-case';
import { UpdateUserUseCase } from './application/use-cases/update-user.use-case';

describe('UsersController', () => {
  let controller: UsersController;
  let createUserUseCase: jest.Mocked<CreateUserUseCase>;
  let listUsersUseCase: jest.Mocked<ListUsersUseCase>;
  let updateUserUseCase: jest.Mocked<UpdateUserUseCase>;

  beforeEach(async () => {
    createUserUseCase = { execute: jest.fn() } as unknown as jest.Mocked<CreateUserUseCase>;
    listUsersUseCase = { execute: jest.fn() } as unknown as jest.Mocked<ListUsersUseCase>;
    updateUserUseCase = { execute: jest.fn() } as unknown as jest.Mocked<UpdateUserUseCase>;

    const moduleRef = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: CreateUserUseCase, useValue: createUserUseCase },
        { provide: ListUsersUseCase, useValue: listUsersUseCase },
        { provide: UpdateUserUseCase, useValue: updateUserUseCase },
      ],
    }).compile();

    controller = moduleRef.get(UsersController);
  });

  it('list() delegates to ListUsersUseCase with the query', async () => {
    const expected = { items: [], total: 0, page: 1, pageSize: 20 };
    listUsersUseCase.execute.mockResolvedValue(expected);

    const query = { page: 1, pageSize: 20 };
    const result = await controller.list(query);

    expect(listUsersUseCase.execute).toHaveBeenCalledWith(query);
    expect(result).toBe(expected);
  });

  it('create() delegates to CreateUserUseCase with the DTO', async () => {
    const expected = {
      id: '1',
      name: 'Buyer',
      email: 'buyer@tg-group.local',
      role: { id: 'role-1', name: 'Comprador' },
      status: 'active' as const,
    };
    createUserUseCase.execute.mockResolvedValue(expected);

    const dto = { name: 'Buyer', email: 'buyer@tg-group.local', password: 'plain-password', roleId: 'role-1' };
    const result = await controller.create(dto);

    expect(createUserUseCase.execute).toHaveBeenCalledWith(dto);
    expect(result).toBe(expected);
  });

  it('update() delegates to UpdateUserUseCase with id and DTO', async () => {
    const expected = {
      id: '1',
      name: 'Buyer',
      email: 'buyer@tg-group.local',
      role: { id: 'role-2', name: 'Administrador' },
      status: 'active' as const,
    };
    updateUserUseCase.execute.mockResolvedValue(expected);

    const result = await controller.update('1', { roleId: 'role-2' });

    expect(updateUserUseCase.execute).toHaveBeenCalledWith('1', { roleId: 'role-2' });
    expect(result).toBe(expected);
  });
});
