import { RequestsController } from './requests.controller';
import { CreateRequestUseCase } from './application/use-cases/create-request.use-case';
import { UpdateRequestUseCase } from './application/use-cases/update-request.use-case';
import { SubmitRequestUseCase } from './application/use-cases/submit-request.use-case';
import { ListRequestsUseCase } from './application/use-cases/list-requests.use-case';
import { GetRequestUseCase } from './application/use-cases/get-request.use-case';
import { ApproveRequestUseCase } from './application/use-cases/approve-request.use-case';
import { RejectRequestUseCase } from './application/use-cases/reject-request.use-case';
import { IntegrateRequestUseCase } from './application/use-cases/integrate-request.use-case';
import { ListPendingApprovalRequestsUseCase } from './application/use-cases/list-pending-approval-requests.use-case';
import { ListPendingIntegrationRequestsUseCase } from './application/use-cases/list-pending-integration-requests.use-case';
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
  let approveRequestUseCase: jest.Mocked<ApproveRequestUseCase>;
  let rejectRequestUseCase: jest.Mocked<RejectRequestUseCase>;
  let integrateRequestUseCase: jest.Mocked<IntegrateRequestUseCase>;
  let listPendingApprovalRequestsUseCase: jest.Mocked<ListPendingApprovalRequestsUseCase>;
  let listPendingIntegrationRequestsUseCase: jest.Mocked<ListPendingIntegrationRequestsUseCase>;
  const user: AuthenticatedRequestUser = { id: 'user-1', email: 'ana@tg-group.local', name: 'Ana', role: 'Administrador' };

  beforeEach(() => {
    createRequestUseCase = { execute: jest.fn() } as unknown as jest.Mocked<CreateRequestUseCase>;
    updateRequestUseCase = { execute: jest.fn() } as unknown as jest.Mocked<UpdateRequestUseCase>;
    submitRequestUseCase = { execute: jest.fn() } as unknown as jest.Mocked<SubmitRequestUseCase>;
    listRequestsUseCase = { execute: jest.fn() } as unknown as jest.Mocked<ListRequestsUseCase>;
    getRequestUseCase = { execute: jest.fn() } as unknown as jest.Mocked<GetRequestUseCase>;
    approveRequestUseCase = { execute: jest.fn() } as unknown as jest.Mocked<ApproveRequestUseCase>;
    rejectRequestUseCase = { execute: jest.fn() } as unknown as jest.Mocked<RejectRequestUseCase>;
    integrateRequestUseCase = { execute: jest.fn() } as unknown as jest.Mocked<IntegrateRequestUseCase>;
    listPendingApprovalRequestsUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<ListPendingApprovalRequestsUseCase>;
    listPendingIntegrationRequestsUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<ListPendingIntegrationRequestsUseCase>;

    controller = new RequestsController(
      createRequestUseCase,
      updateRequestUseCase,
      submitRequestUseCase,
      listRequestsUseCase,
      getRequestUseCase,
      approveRequestUseCase,
      rejectRequestUseCase,
      integrateRequestUseCase,
      listPendingApprovalRequestsUseCase,
      listPendingIntegrationRequestsUseCase,
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

  it('listPendingApproval() delegates to ListPendingApprovalRequestsUseCase with the query', async () => {
    const expected = { items: [], total: 0, page: 1, pageSize: 20 };
    listPendingApprovalRequestsUseCase.execute.mockResolvedValue(expected);

    const query = { page: 1, pageSize: 20 };
    const result = await controller.listPendingApproval(query);

    expect(listPendingApprovalRequestsUseCase.execute).toHaveBeenCalledWith(query);
    expect(result).toBe(expected);
  });

  it('listPendingIntegration() delegates to ListPendingIntegrationRequestsUseCase with the query', async () => {
    const expected = { items: [], total: 0, page: 1, pageSize: 20 };
    listPendingIntegrationRequestsUseCase.execute.mockResolvedValue(expected);

    const query = { page: 1, pageSize: 20 };
    const result = await controller.listPendingIntegration(query);

    expect(listPendingIntegrationRequestsUseCase.execute).toHaveBeenCalledWith(query);
    expect(result).toBe(expected);
  });

  it('approve() delegates to ApproveRequestUseCase with the id, caller id, and optional comment', async () => {
    const expected = { id: 'request-1' };
    approveRequestUseCase.execute.mockResolvedValue(expected as never);

    const result = await controller.approve('request-1', { comment: 'looks fine' }, user);

    expect(approveRequestUseCase.execute).toHaveBeenCalledWith('request-1', 'user-1', 'looks fine');
    expect(result).toBe(expected);
  });

  it('reject() delegates to RejectRequestUseCase with the id, caller id, and mandatory comment', async () => {
    const expected = { id: 'request-1' };
    rejectRequestUseCase.execute.mockResolvedValue(expected as never);

    const result = await controller.reject('request-1', { comment: 'budget exceeded' }, user);

    expect(rejectRequestUseCase.execute).toHaveBeenCalledWith('request-1', 'user-1', 'budget exceeded');
    expect(result).toBe(expected);
  });

  it('integrate() delegates to IntegrateRequestUseCase with the id, caller id, and DTO', async () => {
    const expected = { id: 'request-1' };
    integrateRequestUseCase.execute.mockResolvedValue(expected as never);

    const dto = { items: [{ requestItemId: 'item-1', unitPrice: 100 }] };
    const result = await controller.integrate('request-1', dto, user);

    expect(integrateRequestUseCase.execute).toHaveBeenCalledWith('request-1', 'user-1', dto);
    expect(result).toBe(expected);
  });
});
