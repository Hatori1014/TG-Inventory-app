import { PurchasesController } from './purchases.controller';
import { RegisterPurchaseUseCase } from './application/use-cases/register-purchase.use-case';
import { ListPurchasesUseCase } from './application/use-cases/list-purchases.use-case';
import { GetPurchaseUseCase } from './application/use-cases/get-purchase.use-case';

// Plain instantiation, not Test.createTestingModule — same reasoning as
// InventoryController's spec: @UseInterceptors(IdempotencyInterceptor)
// resolves through a path that ignores a bare testing module's providers,
// and a plain `new` is irrelevant to what this test checks (delegation).
describe('PurchasesController', () => {
  let controller: PurchasesController;
  let registerPurchaseUseCase: jest.Mocked<RegisterPurchaseUseCase>;
  let listPurchasesUseCase: jest.Mocked<ListPurchasesUseCase>;
  let getPurchaseUseCase: jest.Mocked<GetPurchaseUseCase>;

  beforeEach(() => {
    registerPurchaseUseCase = { execute: jest.fn() } as unknown as jest.Mocked<RegisterPurchaseUseCase>;
    listPurchasesUseCase = { execute: jest.fn() } as unknown as jest.Mocked<ListPurchasesUseCase>;
    getPurchaseUseCase = { execute: jest.fn() } as unknown as jest.Mocked<GetPurchaseUseCase>;

    controller = new PurchasesController(registerPurchaseUseCase, listPurchasesUseCase, getPurchaseUseCase);
  });

  it('list() delegates to ListPurchasesUseCase with the query', async () => {
    const expected = { items: [], total: 0, page: 1, pageSize: 20 };
    listPurchasesUseCase.execute.mockResolvedValue(expected);

    const query = { page: 1, pageSize: 20 };
    const result = await controller.list(query);

    expect(listPurchasesUseCase.execute).toHaveBeenCalledWith(query);
    expect(result).toBe(expected);
  });

  it('create() delegates to RegisterPurchaseUseCase with the DTO and current user id', async () => {
    const expected = {
      id: 'purchase-1',
      supplierId: 'supplier-1',
      supplierName: 'Acme Corp',
      userId: 'user-1',
      purchasedAt: '2026-08-19T00:00:00.000Z',
      status: 'received' as const,
      items: [],
      totalAmount: 0,
    };
    registerPurchaseUseCase.execute.mockResolvedValue(expected);

    const dto = { supplierId: 'supplier-1', items: [] };
    const result = await controller.create(dto, {
      id: 'user-1',
      email: 'buyer@tg-group.local',
      name: 'Buyer',
      role: 'Comprador',
    });

    expect(registerPurchaseUseCase.execute).toHaveBeenCalledWith(dto, 'user-1');
    expect(result).toBe(expected);
  });

  it('get() delegates to GetPurchaseUseCase with the id', async () => {
    const expected = {
      id: 'purchase-1',
      supplierId: 'supplier-1',
      supplierName: 'Acme Corp',
      userId: 'user-1',
      purchasedAt: '2026-08-19T00:00:00.000Z',
      status: 'received' as const,
      items: [],
      totalAmount: 0,
    };
    getPurchaseUseCase.execute.mockResolvedValue(expected);

    const result = await controller.get('purchase-1');

    expect(getPurchaseUseCase.execute).toHaveBeenCalledWith('purchase-1');
    expect(result).toBe(expected);
  });
});
