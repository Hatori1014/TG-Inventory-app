import { Test } from '@nestjs/testing';
import { MinimumStockController } from './minimum-stock.controller';
import { CreateMinimumStockUseCase } from './application/use-cases/create-minimum-stock.use-case';
import { UpdateMinimumStockUseCase } from './application/use-cases/update-minimum-stock.use-case';
import { ListMinimumStockUseCase } from './application/use-cases/list-minimum-stock.use-case';

describe('MinimumStockController', () => {
  let controller: MinimumStockController;
  let createMinimumStockUseCase: jest.Mocked<CreateMinimumStockUseCase>;
  let updateMinimumStockUseCase: jest.Mocked<UpdateMinimumStockUseCase>;
  let listMinimumStockUseCase: jest.Mocked<ListMinimumStockUseCase>;

  beforeEach(async () => {
    createMinimumStockUseCase = { execute: jest.fn() } as unknown as jest.Mocked<CreateMinimumStockUseCase>;
    updateMinimumStockUseCase = { execute: jest.fn() } as unknown as jest.Mocked<UpdateMinimumStockUseCase>;
    listMinimumStockUseCase = { execute: jest.fn() } as unknown as jest.Mocked<ListMinimumStockUseCase>;

    const moduleRef = await Test.createTestingModule({
      controllers: [MinimumStockController],
      providers: [
        { provide: CreateMinimumStockUseCase, useValue: createMinimumStockUseCase },
        { provide: UpdateMinimumStockUseCase, useValue: updateMinimumStockUseCase },
        { provide: ListMinimumStockUseCase, useValue: listMinimumStockUseCase },
      ],
    }).compile();

    controller = moduleRef.get(MinimumStockController);
  });

  it('create() delegates to CreateMinimumStockUseCase with the DTO', async () => {
    const expected = { id: 'min-1', productId: 'p1', productName: 'Arroz', minimumQuantity: 10 };
    createMinimumStockUseCase.execute.mockResolvedValue(expected);

    const dto = { productId: 'p1', minimumQuantity: 10 };
    const result = await controller.create(dto);

    expect(createMinimumStockUseCase.execute).toHaveBeenCalledWith(dto);
    expect(result).toBe(expected);
  });

  it('update() delegates to UpdateMinimumStockUseCase with the id and DTO', async () => {
    const expected = { id: 'min-1', productId: 'p1', productName: 'Arroz', minimumQuantity: 35 };
    updateMinimumStockUseCase.execute.mockResolvedValue(expected);

    const dto = { minimumQuantity: 35 };
    const result = await controller.update('min-1', dto);

    expect(updateMinimumStockUseCase.execute).toHaveBeenCalledWith('min-1', dto);
    expect(result).toBe(expected);
  });

  it('list() delegates to ListMinimumStockUseCase with the query', async () => {
    const expected = { items: [], total: 0, page: 1, pageSize: 20 };
    listMinimumStockUseCase.execute.mockResolvedValue(expected);

    const query = { page: 1, pageSize: 20 };
    const result = await controller.list(query);

    expect(listMinimumStockUseCase.execute).toHaveBeenCalledWith(query);
    expect(result).toBe(expected);
  });
});
