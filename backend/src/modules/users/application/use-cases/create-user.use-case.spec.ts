import { BadRequestException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { CreateUserUseCase } from './create-user.use-case';
import { UserRepository } from '../../domain/user.repository.interface';
import { User } from '../../domain/user.entity';

jest.mock('bcrypt');

describe('CreateUserUseCase', () => {
  let useCase: CreateUserUseCase;
  let repository: jest.Mocked<UserRepository>;

  beforeEach(() => {
    repository = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      findAllPaginated: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    useCase = new CreateUserUseCase(repository);
    jest.clearAllMocks();
  });

  it('hashes the password and creates the user, returning it mapped to a DTO', async () => {
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
    const created = new User('1', 'Buyer', 'buyer@tg-group.local', 'hashed-password', 'role-1', 'Comprador', 'active');
    repository.create.mockResolvedValue(created);

    const result = await useCase.execute({
      name: 'Buyer',
      email: 'buyer@tg-group.local',
      password: 'plain-password',
      roleId: 'role-1',
    });

    expect(bcrypt.hash).toHaveBeenCalledWith('plain-password', 10);
    expect(repository.create).toHaveBeenCalledWith({
      name: 'Buyer',
      email: 'buyer@tg-group.local',
      passwordHash: 'hashed-password',
      roleId: 'role-1',
    });
    expect(result).toEqual({
      id: '1',
      name: 'Buyer',
      email: 'buyer@tg-group.local',
      role: { id: 'role-1', name: 'Comprador' },
      status: 'active',
    });
  });

  it('throws ConflictException when the email already exists (P2002)', async () => {
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
    repository.create.mockRejectedValue({ code: 'P2002' });

    await expect(
      useCase.execute({ name: 'Buyer', email: 'dup@tg-group.local', password: 'plain-password', roleId: 'role-1' }),
    ).rejects.toThrow(ConflictException);
  });

  it('throws BadRequestException when roleId does not exist (P2003)', async () => {
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
    repository.create.mockRejectedValue({ code: 'P2003' });

    await expect(
      useCase.execute({ name: 'Buyer', email: 'buyer@tg-group.local', password: 'plain-password', roleId: 'missing' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rethrows any other error unchanged', async () => {
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
    const unexpected = new Error('database is down');
    repository.create.mockRejectedValue(unexpected);

    await expect(
      useCase.execute({ name: 'Buyer', email: 'buyer@tg-group.local', password: 'plain-password', roleId: 'role-1' }),
    ).rejects.toThrow(unexpected);
  });
});
