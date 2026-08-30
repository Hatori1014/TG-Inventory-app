import { Test } from '@nestjs/testing';
import { ErrorEventsController } from './error-events.controller';
import { ListErrorEventsUseCase } from './application/use-cases/list-error-events.use-case';

describe('ErrorEventsController', () => {
  let controller: ErrorEventsController;
  let listErrorEventsUseCase: jest.Mocked<ListErrorEventsUseCase>;

  beforeEach(async () => {
    listErrorEventsUseCase = { execute: jest.fn() } as unknown as jest.Mocked<ListErrorEventsUseCase>;

    const moduleRef = await Test.createTestingModule({
      controllers: [ErrorEventsController],
      providers: [{ provide: ListErrorEventsUseCase, useValue: listErrorEventsUseCase }],
    }).compile();

    controller = moduleRef.get(ErrorEventsController);
  });

  it('list() delegates to ListErrorEventsUseCase with the query', async () => {
    const expected = { items: [], total: 0, page: 1, pageSize: 20 };
    listErrorEventsUseCase.execute.mockResolvedValue(expected);

    const query = { page: 1, pageSize: 20, module: 'roles' };
    const result = await controller.list(query);

    expect(listErrorEventsUseCase.execute).toHaveBeenCalledWith(query);
    expect(result).toBe(expected);
  });
});
