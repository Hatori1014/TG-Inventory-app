import { Test } from '@nestjs/testing';
import { UnitsController } from './units.controller';
import { CreateUnitUseCase } from './application/use-cases/create-unit.use-case';
import { ListUnitsUseCase } from './application/use-cases/list-units.use-case';
import { UpdateUnitUseCase } from './application/use-cases/update-unit.use-case';

describe('UnitsController', () => {
  let controller: UnitsController;
  let createUnitUseCase: jest.Mocked<CreateUnitUseCase>;
  let listUnitsUseCase: jest.Mocked<ListUnitsUseCase>;
  let updateUnitUseCase: jest.Mocked<UpdateUnitUseCase>;

  beforeEach(async () => {
    createUnitUseCase = { execute: jest.fn() } as unknown as jest.Mocked<CreateUnitUseCase>;
    listUnitsUseCase = { execute: jest.fn() } as unknown as jest.Mocked<ListUnitsUseCase>;
    updateUnitUseCase = { execute: jest.fn() } as unknown as jest.Mocked<UpdateUnitUseCase>;

    const moduleRef = await Test.createTestingModule({
      controllers: [UnitsController],
      providers: [
        { provide: CreateUnitUseCase, useValue: createUnitUseCase },
        { provide: ListUnitsUseCase, useValue: listUnitsUseCase },
        { provide: UpdateUnitUseCase, useValue: updateUnitUseCase },
      ],
    }).compile();

    controller = moduleRef.get(UnitsController);
  });

  it('list() delegates to ListUnitsUseCase with the query', async () => {
    const expected = { items: [], total: 0, page: 1, pageSize: 20 };
    listUnitsUseCase.execute.mockResolvedValue(expected);

    const query = { page: 1, pageSize: 20 };
    const result = await controller.list(query);

    expect(listUnitsUseCase.execute).toHaveBeenCalledWith(query);
    expect(result).toBe(expected);
  });

  it('create() delegates to CreateUnitUseCase with the DTO', async () => {
    const expected = { id: '1', name: 'Kilogramo', status: 'active' as const };
    createUnitUseCase.execute.mockResolvedValue(expected);

    const dto = { name: 'Kilogramo' };
    const result = await controller.create(dto);

    expect(createUnitUseCase.execute).toHaveBeenCalledWith(dto);
    expect(result).toBe(expected);
  });

  it('update() delegates to UpdateUnitUseCase with id and DTO', async () => {
    const expected = { id: '1', name: 'Kilogramo', status: 'inactive' as const };
    updateUnitUseCase.execute.mockResolvedValue(expected);

    const result = await controller.update('1', { status: 'inactive' });

    expect(updateUnitUseCase.execute).toHaveBeenCalledWith('1', { status: 'inactive' });
    expect(result).toBe(expected);
  });
});
