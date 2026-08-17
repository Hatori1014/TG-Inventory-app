import { ListRolesUseCase } from './list-roles.use-case';
import { RoleRepository } from '../../domain/role.repository.interface';
import { Role } from '../../domain/role.entity';
import { Permission } from '../../domain/permission.value-object';
import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';

describe('ListRolesUseCase', () => {
  let useCase: ListRolesUseCase;
  let repository: jest.Mocked<RoleRepository>;

  beforeEach(() => {
    repository = {
      findAllPaginated: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      replacePermissions: jest.fn(),
    };
    useCase = new ListRolesUseCase(repository);
  });

  it('translates page/pageSize into skip/take and returns a paginated response', async () => {
    const roles = [new Role('1', 'Administrador', null, [new Permission('roles', 'read', 'p1')])];
    repository.findAllPaginated.mockResolvedValue({ items: roles, total: 1 });

    const query: PaginationQueryDto = { page: 2, pageSize: 10 };
    const result = await useCase.execute(query);

    expect(repository.findAllPaginated).toHaveBeenCalledWith(10, 10);
    expect(result).toEqual({
      items: [
        {
          id: '1',
          name: 'Administrador',
          description: null,
          permissions: [{ id: 'p1', module: 'roles', action: 'read' }],
        },
      ],
      total: 1,
      page: 2,
      pageSize: 10,
    });
  });
});
