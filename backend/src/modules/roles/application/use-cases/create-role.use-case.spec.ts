import { ConflictException } from '@nestjs/common';
import { CreateRoleUseCase } from './create-role.use-case';
import { RoleRepository } from '../../domain/role.repository.interface';
import { Role } from '../../domain/role.entity';

describe('CreateRoleUseCase', () => {
  let useCase: CreateRoleUseCase;
  let repository: jest.Mocked<RoleRepository>;

  beforeEach(() => {
    repository = {
      findAllPaginated: jest.fn(),
      findById: jest.fn(),
      findDefault: jest.fn(),
      create: jest.fn(),
      replacePermissions: jest.fn(),
      softDelete: jest.fn(),
    };
    useCase = new CreateRoleUseCase(repository);
  });

  it('creates a role and returns it mapped to a DTO', async () => {
    const created = new Role('1', 'Comprador', 'Buys stuff', []);
    repository.create.mockResolvedValue(created);

    const result = await useCase.execute({ name: 'Comprador', description: 'Buys stuff' });

    expect(repository.create).toHaveBeenCalledWith('Comprador', 'Buys stuff');
    expect(result).toEqual({ id: '1', name: 'Comprador', description: 'Buys stuff', permissions: [], isDefault: false });
  });

  it('throws ConflictException when the role name already exists (P2002)', async () => {
    repository.create.mockRejectedValue({ code: 'P2002' });

    await expect(useCase.execute({ name: 'Administrador' })).rejects.toThrow(ConflictException);
  });

  it('rethrows any other error unchanged', async () => {
    const unexpected = new Error('database is down');
    repository.create.mockRejectedValue(unexpected);

    await expect(useCase.execute({ name: 'Comprador' })).rejects.toThrow(unexpected);
  });
});
