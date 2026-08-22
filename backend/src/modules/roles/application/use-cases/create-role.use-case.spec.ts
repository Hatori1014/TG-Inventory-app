import { ConflictException } from '@nestjs/common';
import { CreateRoleUseCase } from './create-role.use-case';
import { RoleRepository } from '../../domain/role.repository.interface';
import { Role } from '../../domain/role.entity';
import { RecordAuditEventUseCase } from '../../../audit/application/use-cases/record-audit-event.use-case';

describe('CreateRoleUseCase', () => {
  let useCase: CreateRoleUseCase;
  let repository: jest.Mocked<RoleRepository>;
  let recordAuditEvent: jest.Mocked<RecordAuditEventUseCase>;

  beforeEach(() => {
    repository = {
      findAllPaginated: jest.fn(),
      findById: jest.fn(),
      findDefault: jest.fn(),
      create: jest.fn(),
      replacePermissions: jest.fn(),
      softDelete: jest.fn(),
    };
    recordAuditEvent = { execute: jest.fn() } as unknown as jest.Mocked<RecordAuditEventUseCase>;
    useCase = new CreateRoleUseCase(repository, recordAuditEvent);
  });

  it('creates a role, audits it, and returns it mapped to a DTO', async () => {
    const created = new Role('1', 'Comprador', 'Buys stuff', []);
    repository.create.mockResolvedValue(created);

    const result = await useCase.execute({ name: 'Comprador', description: 'Buys stuff' }, 'actor-1');

    expect(repository.create).toHaveBeenCalledWith('Comprador', 'Buys stuff');
    expect(recordAuditEvent.execute).toHaveBeenCalledWith({
      userId: 'actor-1',
      action: 'role.create',
      entity: 'Role',
      entityId: '1',
    });
    expect(result).toEqual({ id: '1', name: 'Comprador', description: 'Buys stuff', permissions: [], isDefault: false });
  });

  it('throws ConflictException when the role name already exists (P2002)', async () => {
    repository.create.mockRejectedValue({ code: 'P2002' });

    await expect(useCase.execute({ name: 'Administrador' }, 'actor-1')).rejects.toThrow(ConflictException);
    expect(recordAuditEvent.execute).not.toHaveBeenCalled();
  });

  it('rethrows any other error unchanged', async () => {
    const unexpected = new Error('database is down');
    repository.create.mockRejectedValue(unexpected);

    await expect(useCase.execute({ name: 'Comprador' }, 'actor-1')).rejects.toThrow(unexpected);
  });
});
