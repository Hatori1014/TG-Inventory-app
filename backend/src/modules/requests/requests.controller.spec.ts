import { RequestsController } from './requests.controller';
import { CreateRequestUseCase } from './application/use-cases/create-request.use-case';
import { UpdateRequestUseCase } from './application/use-cases/update-request.use-case';
import { SubmitRequestUseCase } from './application/use-cases/submit-request.use-case';
import { ListRequestsUseCase } from './application/use-cases/list-requests.use-case';
import { GetRequestUseCase } from './application/use-cases/get-request.use-case';
import { AuthenticatedRequestUser } from '../../common/decorators/current-user.decorator';

// Plain instantiation, not Test.createTestingModule() — @UseInterceptors(
// IdempotencyInterceptor) makes Nest try to resolve its own dependencies
// (Reflector, PrismaService) even in a bare testing module. Same fix
// already used by PurchasesController/InventoryController's specs.
describe('RequestsController', () => {
  let controller: RequestsController;
  let createRequestUseCase: jest.Mocked<CreateRequestUseCase>;
  let updateRequestUseCase: jest.Mocked<UpdateRequestUseCase>;
  let submitRequestUseCase: jest.Mocked<SubmitRequestUseCase>;
  let listRequestsUseCase: jest.Mocked<ListRequestsUseCase>;
  let getRequestUseCase: jest.Mocked<GetRequestUseCase>;
  const user: AuthenticatedRequestUser = { id: 'user-1', email: 'ana@tg-group.local', name: 'Ana', role: 'Administrador' };

  beforeEach(() => {
    createRequestUseCase = { execute: jest.fn() } as unknown as jest.Mocked<CreateRequestUseCase>;
    updateRequestUseCase = { execute: jest.fn() } as unknown as jest.Mocked<UpdateRequestUseCase>;
    submitRequestUseCase = { execute: jest.fn() } as unknown as jest.Mocked<SubmitRequestUseCase>;
    listRequestsUseCase = { execute: jest.fn() } as unknown as jest.Mocked<ListRequestsUseCase>;
    getRequestUseCase = { execute: jest.fn() } as unknown as jest.Mocked<GetRequestUseCase>;

    controller = new RequestsController(
      createRequestUseCase,
      updateRequestUseCase,
      submitRequestUseCase,
      listRequestsUseCase,
      getRequestUseCase,
    );
  });

  it('create() delegates to CreateRequestUseCase with the caller id and DTO', async () => {
    const expected = { id: 'request-1' };
    createRequestUseCase.execute.mockResolvedValue(expected as never);

    const dto = { type: 'purchase' as const };
    const result = await controller.create(dto, user);

    expect(createRequestUseCase.execute).toHaveBeenCalledWith('user-1', dto);
    expect(result).toBe(expected);
  });

  it('update() delegates to UpdateRequestUseCase with the id, caller id, and DTO', async () => {
    const expected = { id: 'request-1' };
    updateRequestUseCase.execute.mockResolvedValue(expected as never);

    const dto = { notes: 'urgent' };
    const result = await controller.update('request-1', dto, user);

    expect(updateRequestUseCase.execute).toHaveBeenCalledWith('request-1', 'user-1', dto);
    expect(result).toBe(expected);
  });

  it('submit() delegates to SubmitRequestUseCase with the id and caller id', async () => {
    const expected = { id: 'request-1' };
    submitRequestUseCase.execute.mockResolvedValue(expected as never);

    const result = await controller.submit('request-1', user);

    expect(submitRequestUseCase.execute).toHaveBeenCalledWith('request-1', 'user-1');
    expect(result).toBe(expected);
  });

  it('list() delegates to ListRequestsUseCase with the caller id and query', async () => {
    const expected = { items: [], total: 0, page: 1, pageSize: 20 };
    listRequestsUseCase.execute.mockResolvedValue(expected);

    const query = { page: 1, pageSize: 20 };
    const result = await controller.list(query, user);

    expect(listRequestsUseCase.execute).toHaveBeenCalledWith('user-1', query);
    expect(result).toBe(expected);
  });

  it('get() delegates to GetRequestUseCase with the id and caller id', async () => {
    const expected = { id: 'request-1' };
    getRequestUseCase.execute.mockResolvedValue(expected as never);

    const result = await controller.get('request-1', user);

    expect(getRequestUseCase.execute).toHaveBeenCalledWith('request-1', 'user-1');
    expect(result).toBe(expected);
  });
});
