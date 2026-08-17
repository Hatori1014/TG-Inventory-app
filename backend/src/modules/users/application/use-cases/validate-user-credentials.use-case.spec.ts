import * as bcrypt from 'bcrypt';
import { ValidateUserCredentialsUseCase } from './validate-user-credentials.use-case';
import { UserRepository } from '../../domain/user.repository.interface';
import { User } from '../../domain/user.entity';

jest.mock('bcrypt');

describe('ValidateUserCredentialsUseCase', () => {
  let useCase: ValidateUserCredentialsUseCase;
  let repository: jest.Mocked<UserRepository>;

  const activeUser = new User('1', 'Admin', 'admin@tg-group.local', 'hashed', 'role-1', 'Administrador', 'active');
  const blockedUser = new User('2', 'Blocked', 'blocked@tg-group.local', 'hashed', 'role-1', 'Administrador', 'blocked');

  beforeEach(() => {
    repository = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      findAllPaginated: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    useCase = new ValidateUserCredentialsUseCase(repository);
    jest.clearAllMocks();
  });

  it('returns null when no user matches the email', async () => {
    repository.findByEmail.mockResolvedValue(null);

    const result = await useCase.execute('missing@tg-group.local', 'whatever');

    expect(result).toBeNull();
  });

  it('returns null when the password does not match', async () => {
    repository.findByEmail.mockResolvedValue(activeUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    const result = await useCase.execute(activeUser.getEmail(), 'wrong-password');

    expect(result).toBeNull();
  });

  it('returns null when the user is blocked, even with a correct password', async () => {
    repository.findByEmail.mockResolvedValue(blockedUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const result = await useCase.execute(blockedUser.getEmail(), 'correct-password');

    expect(result).toBeNull();
  });

  it('returns the authenticated user DTO on success — never the password hash', async () => {
    repository.findByEmail.mockResolvedValue(activeUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const result = await useCase.execute(activeUser.getEmail(), 'correct-password');

    expect(result).toEqual({
      id: activeUser.getId(),
      name: activeUser.getName(),
      email: activeUser.getEmail(),
      role: activeUser.getRoleName(),
    });
  });
});
