import { ListPermissionsUseCase } from './list-permissions.use-case';
import { PermissionRepository } from '../../domain/permission.repository.interface';
import { Permission } from '../../domain/permission.value-object';
import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';

describe('ListPermissionsUseCase', () => {
  let useCase: ListPermissionsUseCase;
  let repository: jest.Mocked<PermissionRepository>;

  beforeEach(() => {
    repository = { findAllPaginated: jest.fn(), findManyByIds: jest.fn() };
    useCase = new ListPermissionsUseCase(repository);
  });

  it('translates page/pageSize into skip/take and returns a paginated response', async () => {
    repository.findAllPaginated.mockResolvedValue({
      items: [new Permission('roles', 'read', 'p1')],
      total: 1,
    });

    const query: PaginationQueryDto = { page: 1, pageSize: 100 };
    const result = await useCase.execute(query);

    expect(repository.findAllPaginated).toHaveBeenCalledWith(0, 100);
    expect(result).toEqual({
      items: [{ id: 'p1', module: 'roles', action: 'read' }],
      total: 1,
      page: 1,
      pageSize: 100,
    });
  });
});
