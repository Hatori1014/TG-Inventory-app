import { Test } from '@nestjs/testing';
import { ProductsController } from './products.controller';
import { CreateProductUseCase } from './application/use-cases/create-product.use-case';
import { ListProductsUseCase } from './application/use-cases/list-products.use-case';
import { UpdateProductUseCase } from './application/use-cases/update-product.use-case';

describe('ProductsController', () => {
  let controller: ProductsController;
  let createProductUseCase: jest.Mocked<CreateProductUseCase>;
  let listProductsUseCase: jest.Mocked<ListProductsUseCase>;
  let updateProductUseCase: jest.Mocked<UpdateProductUseCase>;

  const unit = { id: 'unit-1', name: 'Kilogramo', status: 'active' as const };

  beforeEach(async () => {
    createProductUseCase = { execute: jest.fn() } as unknown as jest.Mocked<CreateProductUseCase>;
    listProductsUseCase = { execute: jest.fn() } as unknown as jest.Mocked<ListProductsUseCase>;
    updateProductUseCase = { execute: jest.fn() } as unknown as jest.Mocked<UpdateProductUseCase>;

    const moduleRef = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        { provide: CreateProductUseCase, useValue: createProductUseCase },
        { provide: ListProductsUseCase, useValue: listProductsUseCase },
        { provide: UpdateProductUseCase, useValue: updateProductUseCase },
      ],
    }).compile();

    controller = moduleRef.get(ProductsController);
  });

  it('list() delegates to ListProductsUseCase with the query', async () => {
    const expected = { items: [], total: 0, page: 1, pageSize: 20 };
    listProductsUseCase.execute.mockResolvedValue(expected);

    const query = { page: 1, pageSize: 20 };
    const result = await controller.list(query);

    expect(listProductsUseCase.execute).toHaveBeenCalledWith(query);
    expect(result).toBe(expected);
  });

  it('create() delegates to CreateProductUseCase with the DTO', async () => {
    const expected = {
      id: '1',
      name: 'Arroz',
      description: null,
      unit,
      category: null,
      requiresBatch: false,
      imageUrl: null,
      status: 'active' as const,
    };
    createProductUseCase.execute.mockResolvedValue(expected);

    const dto = { name: 'Arroz', unitId: 'unit-1' };
    const result = await controller.create(dto);

    expect(createProductUseCase.execute).toHaveBeenCalledWith(dto);
    expect(result).toBe(expected);
  });

  it('update() delegates to UpdateProductUseCase with id and DTO', async () => {
    const expected = {
      id: '1',
      name: 'Arroz',
      description: null,
      unit,
      category: null,
      requiresBatch: false,
      imageUrl: null,
      status: 'discontinued' as const,
    };
    updateProductUseCase.execute.mockResolvedValue(expected);

    const result = await controller.update('1', { status: 'discontinued' });

    expect(updateProductUseCase.execute).toHaveBeenCalledWith('1', { status: 'discontinued' });
    expect(result).toBe(expected);
  });
});
