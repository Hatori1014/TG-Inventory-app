import { Test } from '@nestjs/testing';
import { PermissionsController } from './permissions.controller';
import { ListPermissionsUseCase } from './application/use-cases/list-permissions.use-case';

describe('PermissionsController', () => {
  let controller: PermissionsController;
  let listPermissionsUseCase: jest.Mocked<ListPermissionsUseCase>;

  beforeEach(async () => {
    listPermissionsUseCase = { execute: jest.fn() } as unknown as jest.Mocked<ListPermissionsUseCase>;

    const moduleRef = await Test.createTestingModule({
      controllers: [PermissionsController],
      providers: [{ provide: ListPermissionsUseCase, useValue: listPermissionsUseCase }],
    }).compile();

    controller = moduleRef.get(PermissionsController);
  });

  it('list() delegates to ListPermissionsUseCase with the query', async () => {
    const expected = { items: [], total: 0, page: 1, pageSize: 100 };
    listPermissionsUseCase.execute.mockResolvedValue(expected);

    const query = { page: 1, pageSize: 100 };
    const result = await controller.list(query);

    expect(listPermissionsUseCase.execute).toHaveBeenCalledWith(query);
    expect(result).toBe(expected);
  });
});
