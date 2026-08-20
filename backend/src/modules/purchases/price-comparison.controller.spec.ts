import { PriceComparisonController } from './price-comparison.controller';
import { GetProductPriceComparisonUseCase } from './application/use-cases/get-product-price-comparison.use-case';
import { GetSupplierPriceComparisonUseCase } from './application/use-cases/get-supplier-price-comparison.use-case';

describe('PriceComparisonController', () => {
  let controller: PriceComparisonController;
  let getProductPriceComparisonUseCase: jest.Mocked<GetProductPriceComparisonUseCase>;
  let getSupplierPriceComparisonUseCase: jest.Mocked<GetSupplierPriceComparisonUseCase>;

  beforeEach(() => {
    getProductPriceComparisonUseCase = { execute: jest.fn() } as unknown as jest.Mocked<GetProductPriceComparisonUseCase>;
    getSupplierPriceComparisonUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetSupplierPriceComparisonUseCase>;

    controller = new PriceComparisonController(getProductPriceComparisonUseCase, getSupplierPriceComparisonUseCase);
  });

  it('byProduct() delegates to GetProductPriceComparisonUseCase with the productId', async () => {
    const expected = { productId: 'p1', productName: 'Arroz', suppliers: [] };
    getProductPriceComparisonUseCase.execute.mockResolvedValue(expected);

    const result = await controller.byProduct({ productId: 'p1' });

    expect(getProductPriceComparisonUseCase.execute).toHaveBeenCalledWith('p1');
    expect(result).toBe(expected);
  });

  it('bySuppliers() delegates to GetSupplierPriceComparisonUseCase with the supplierIds', async () => {
    const expected = { suppliers: [], rows: [] };
    getSupplierPriceComparisonUseCase.execute.mockResolvedValue(expected);

    const result = await controller.bySuppliers({ supplierIds: ['s1', 's2'] });

    expect(getSupplierPriceComparisonUseCase.execute).toHaveBeenCalledWith(['s1', 's2']);
    expect(result).toBe(expected);
  });
});
