import { SupplierPurchaseHistoryController } from './supplier-purchase-history.controller';
import { GetSupplierPurchaseHistoryUseCase } from './application/use-cases/get-supplier-purchase-history.use-case';

describe('SupplierPurchaseHistoryController', () => {
  let controller: SupplierPurchaseHistoryController;
  let getSupplierPurchaseHistoryUseCase: jest.Mocked<GetSupplierPurchaseHistoryUseCase>;

  beforeEach(() => {
    getSupplierPurchaseHistoryUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetSupplierPurchaseHistoryUseCase>;

    controller = new SupplierPurchaseHistoryController(getSupplierPurchaseHistoryUseCase);
  });

  it('history() delegates to GetSupplierPurchaseHistoryUseCase with the id and query', async () => {
    const expected = { items: [], total: 0, page: 1, pageSize: 20 };
    getSupplierPurchaseHistoryUseCase.execute.mockResolvedValue(expected);

    const query = { page: 1, pageSize: 20 };
    const result = await controller.history('supplier-1', query);

    expect(getSupplierPurchaseHistoryUseCase.execute).toHaveBeenCalledWith('supplier-1', query);
    expect(result).toBe(expected);
  });
});
