import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { UpdateUserUseCase } from './update-user.use-case';
import { UserRepository } from '../../domain/user.repository.interface';
import { User } from '../../domain/user.entity';

describe('UpdateUserUseCase', () => {
  let useCase: UpdateUserUseCase;
  let repository: jest.Mocked<UserRepository>;

  beforeEach(() => {
    repository = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      findAllPaginated: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      reassignRole: jest.fn(),
      findRoleStatus: jest.fn().mockResolvedValue('active'),
    };
    useCase = new UpdateUserUseCase(repository);
  });

  it('throws BadRequestException when no field is provided', async () => {
    await expect(useCase.execute('1', {})).rejects.toThrow(BadRequestException);
    expect(repository.findById).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when the user does not exist', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(useCase.execute('missing', { roleId: 'role-2' })).rejects.toThrow(NotFoundException);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('throws ConflictException when the new email already exists (P2002)', async () => {
    repository.findById.mockResolvedValue(
      new User('1', 'Buyer', 'buyer@tg-group.local', 'hash', 'role-1', 'Comprador', 'active'),
    );
    repository.update.mockRejectedValue({ code: 'P2002' });

    await expect(useCase.execute('1', { email: 'taken@tg-group.local' })).rejects.toThrow(ConflictException);
  });

  it('throws BadRequestException when roleId does not exist (P2003)', async () => {
    repository.findById.mockResolvedValue(
      new User('1', 'Buyer', 'buyer@tg-group.local', 'hash', 'role-1', 'Comprador', 'active'),
    );
    repository.update.mockRejectedValue({ code: 'P2003' });

    await expect(useCase.execute('1', { roleId: 'missing' })).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException when the new roleId refers to a (logically) deleted role', async () => {
    repository.findById.mockResolvedValue(
      new User('1', 'Buyer', 'buyer@tg-group.local', 'hash', 'role-1', 'Comprador', 'active'),
    );
    repository.findRoleStatus.mockResolvedValue('deleted');

    await expect(useCase.execute('1', { roleId: 'role-deleted' })).rejects.toThrow(BadRequestException);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('updates the user and returns it mapped to a DTO', async () => {
    repository.findById.mockResolvedValue(
      new User('1', 'Buyer', 'buyer@tg-group.local', 'hash', 'role-1', 'Comprador', 'active'),
    );
    const updated = new User('1', 'Buyer', 'buyer@tg-group.local', 'hash', 'role-2', 'Administrador', 'active');
    repository.update.mockResolvedValue(updated);

    const result = await useCase.execute('1', { roleId: 'role-2' });

    expect(repository.update).toHaveBeenCalledWith('1', { roleId: 'role-2' });
    expect(result.role).toEqual({ id: 'role-2', name: 'Administrador' });
  });
});
