import { Test } from '@nestjs/testing';
import { SuppliersController } from './suppliers.controller';
import { CreateSupplierUseCase } from './application/use-cases/create-supplier.use-case';
import { ListSuppliersUseCase } from './application/use-cases/list-suppliers.use-case';
import { UpdateSupplierUseCase } from './application/use-cases/update-supplier.use-case';

describe('SuppliersController', () => {
  let controller: SuppliersController;
  let createSupplierUseCase: jest.Mocked<CreateSupplierUseCase>;
  let listSuppliersUseCase: jest.Mocked<ListSuppliersUseCase>;
  let updateSupplierUseCase: jest.Mocked<UpdateSupplierUseCase>;

  beforeEach(async () => {
    createSupplierUseCase = { execute: jest.fn() } as unknown as jest.Mocked<CreateSupplierUseCase>;
    listSuppliersUseCase = { execute: jest.fn() } as unknown as jest.Mocked<ListSuppliersUseCase>;
    updateSupplierUseCase = { execute: jest.fn() } as unknown as jest.Mocked<UpdateSupplierUseCase>;

    const moduleRef = await Test.createTestingModule({
      controllers: [SuppliersController],
      providers: [
        { provide: CreateSupplierUseCase, useValue: createSupplierUseCase },
        { provide: ListSuppliersUseCase, useValue: listSuppliersUseCase },
        { provide: UpdateSupplierUseCase, useValue: updateSupplierUseCase },
      ],
    }).compile();

    controller = moduleRef.get(SuppliersController);
  });

  it('list() delegates to ListSuppliersUseCase with the query', async () => {
    const expected = { items: [], total: 0, page: 1, pageSize: 20 };
    listSuppliersUseCase.execute.mockResolvedValue(expected);

    const query = { page: 1, pageSize: 20 };
    const result = await controller.list(query);

    expect(listSuppliersUseCase.execute).toHaveBeenCalledWith(query);
    expect(result).toBe(expected);
  });

  it('create() delegates to CreateSupplierUseCase with the DTO', async () => {
    const expected = {
      id: '1',
      name: 'Acme Corp',
      taxId: null,
      contact: null,
      phone: null,
      email: null,
      status: 'active' as const,
    };
    createSupplierUseCase.execute.mockResolvedValue(expected);

    const dto = { name: 'Acme Corp' };
    const result = await controller.create(dto);

    expect(createSupplierUseCase.execute).toHaveBeenCalledWith(dto);
    expect(result).toBe(expected);
  });

  it('update() delegates to UpdateSupplierUseCase with id and DTO', async () => {
    const expected = {
      id: '1',
      name: 'Acme Corp',
      taxId: null,
      contact: null,
      phone: null,
      email: null,
      status: 'inactive' as const,
    };
    updateSupplierUseCase.execute.mockResolvedValue(expected);

    const result = await controller.update('1', { status: 'inactive' });

    expect(updateSupplierUseCase.execute).toHaveBeenCalledWith('1', { status: 'inactive' });
    expect(result).toBe(expected);
  });
});
