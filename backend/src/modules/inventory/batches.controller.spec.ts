import { Test } from '@nestjs/testing';
import { BatchesController } from './batches.controller';
import { CreateBatchUseCase } from './application/use-cases/create-batch.use-case';
import { ListBatchesUseCase } from './application/use-cases/list-batches.use-case';

describe('BatchesController', () => {
  let controller: BatchesController;
  let createBatchUseCase: jest.Mocked<CreateBatchUseCase>;
  let listBatchesUseCase: jest.Mocked<ListBatchesUseCase>;

  beforeEach(async () => {
    createBatchUseCase = { execute: jest.fn() } as unknown as jest.Mocked<CreateBatchUseCase>;
    listBatchesUseCase = { execute: jest.fn() } as unknown as jest.Mocked<ListBatchesUseCase>;

    const moduleRef = await Test.createTestingModule({
      controllers: [BatchesController],
      providers: [
        { provide: CreateBatchUseCase, useValue: createBatchUseCase },
        { provide: ListBatchesUseCase, useValue: listBatchesUseCase },
      ],
    }).compile();

    controller = moduleRef.get(BatchesController);
  });

  it('create() delegates to CreateBatchUseCase with the DTO', async () => {
    const expected = { id: 'b1', productId: 'p1', batchNumber: 'LOT-1', expiresAt: null, receivedAt: '2026-08-16' };
    createBatchUseCase.execute.mockResolvedValue(expected);

    const dto = { productId: 'p1', batchNumber: 'LOT-1' };
    const result = await controller.create(dto);

    expect(createBatchUseCase.execute).toHaveBeenCalledWith(dto);
    expect(result).toBe(expected);
  });

  it('listByProduct() delegates to ListBatchesUseCase with productId and the query', async () => {
    const expected = { items: [], total: 0, page: 1, pageSize: 20 };
    listBatchesUseCase.execute.mockResolvedValue(expected);

    const query = { page: 1, pageSize: 20 };
    const result = await controller.listByProduct('p1', query);

    expect(listBatchesUseCase.execute).toHaveBeenCalledWith('p1', query);
    expect(result).toBe(expected);
  });
});
