import { ListUsersUseCase } from './list-users.use-case';
import { UserRepository } from '../../domain/user.repository.interface';
import { User } from '../../domain/user.entity';
import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';

describe('ListUsersUseCase', () => {
  let useCase: ListUsersUseCase;
  let repository: jest.Mocked<UserRepository>;

  beforeEach(() => {
    repository = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      findAllPaginated: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    useCase = new ListUsersUseCase(repository);
  });

  it('translates page/pageSize into skip/take and returns a paginated response', async () => {
    const users = [new User('1', 'Admin', 'admin@tg-group.local', 'hash', 'role-1', 'Administrador', 'active')];
    repository.findAllPaginated.mockResolvedValue({ items: users, total: 1 });

    const query: PaginationQueryDto = { page: 2, pageSize: 10 };
    const result = await useCase.execute(query);

    expect(repository.findAllPaginated).toHaveBeenCalledWith(10, 10);
    expect(result).toEqual({
      items: [
        {
          id: '1',
          name: 'Admin',
          email: 'admin@tg-group.local',
          role: { id: 'role-1', name: 'Administrador' },
          status: 'active',
        },
      ],
      total: 1,
      page: 2,
      pageSize: 10,
    });
  });
});
