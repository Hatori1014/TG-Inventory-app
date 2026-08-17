import { InventoryController } from './inventory.controller';
import { RegisterMovementUseCase } from './application/use-cases/register-movement.use-case';
import { RegisterTransferUseCase } from './application/use-cases/register-transfer.use-case';
import { ListStockUseCase } from './application/use-cases/list-stock.use-case';

// Plain instantiation, not Test.createTestingModule: NestJS resolves
// @UseInterceptors(IdempotencyInterceptor) through an internal instantiation
// path that ignores providers/overrideProvider() in a bare testing module
// (no such class-level enhancer exists on any other controller in this
// codebase yet, so there's no precedent to follow here). A plain `new` skips
// the decorator/guard/interceptor pipeline entirely — irrelevant to what
// this test actually verifies (delegation to the use-cases), which is
// exactly what every other controller spec in this codebase checks too.
describe('InventoryController', () => {
  let controller: InventoryController;
  let registerMovementUseCase: jest.Mocked<RegisterMovementUseCase>;
  let registerTransferUseCase: jest.Mocked<RegisterTransferUseCase>;
  let listStockUseCase: jest.Mocked<ListStockUseCase>;

  beforeEach(() => {
    registerMovementUseCase = { execute: jest.fn() } as unknown as jest.Mocked<RegisterMovementUseCase>;
    registerTransferUseCase = { execute: jest.fn() } as unknown as jest.Mocked<RegisterTransferUseCase>;
    listStockUseCase = { execute: jest.fn() } as unknown as jest.Mocked<ListStockUseCase>;

    controller = new InventoryController(registerMovementUseCase, registerTransferUseCase, listStockUseCase);
  });

  it('create() delegates to RegisterMovementUseCase for "in"/"out"/"adjustment"', async () => {
    const expected = {
      id: 'mv-1',
      productId: 'p1',
      locationId: 'l1',
      batchId: null,
      type: 'in',
      quantity: 10,
      userId: 'u1',
      occurredAt: new Date(),
      notes: null,
    };
    registerMovementUseCase.execute.mockResolvedValue(expected);

    const dto = { productId: 'p1', locationId: 'l1', type: 'in' as const, quantity: 10 };
    const result = await controller.create(dto, { id: 'u1', email: 'a@b.com', name: 'A', role: 'Administrador' });

    expect(registerMovementUseCase.execute).toHaveBeenCalledWith(dto, 'u1');
    expect(registerTransferUseCase.execute).not.toHaveBeenCalled();
    expect(result).toBe(expected);
  });

  it('create() delegates to RegisterTransferUseCase when type is "transfer"', async () => {
    const expected = {
      out: { id: 'mv-out' } as any,
      in: { id: 'mv-in' } as any,
    };
    registerTransferUseCase.execute.mockResolvedValue(expected);

    const dto = {
      productId: 'p1',
      locationId: 'l1',
      destinationLocationId: 'l2',
      type: 'transfer' as const,
      quantity: 10,
    };
    const result = await controller.create(dto, { id: 'u1', email: 'a@b.com', name: 'A', role: 'Administrador' });

    expect(registerTransferUseCase.execute).toHaveBeenCalledWith(dto, 'u1');
    expect(registerMovementUseCase.execute).not.toHaveBeenCalled();
    expect(result).toBe(expected);
  });

  it('listStock() delegates to ListStockUseCase with the query', async () => {
    const expected = { items: [], total: 0, page: 1, pageSize: 20 };
    listStockUseCase.execute.mockResolvedValue(expected);

    const query = { page: 1, pageSize: 20 };
    const result = await controller.listStock(query);

    expect(listStockUseCase.execute).toHaveBeenCalledWith(query);
    expect(result).toBe(expected);
  });
});
