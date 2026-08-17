import { Test } from '@nestjs/testing';
import { LocationsController } from './locations.controller';
import { CreateLocationUseCase } from './application/use-cases/create-location.use-case';
import { ListLocationsUseCase } from './application/use-cases/list-locations.use-case';
import { UpdateLocationUseCase } from './application/use-cases/update-location.use-case';

describe('LocationsController', () => {
  let controller: LocationsController;
  let createLocationUseCase: jest.Mocked<CreateLocationUseCase>;
  let listLocationsUseCase: jest.Mocked<ListLocationsUseCase>;
  let updateLocationUseCase: jest.Mocked<UpdateLocationUseCase>;

  beforeEach(async () => {
    createLocationUseCase = { execute: jest.fn() } as unknown as jest.Mocked<CreateLocationUseCase>;
    listLocationsUseCase = { execute: jest.fn() } as unknown as jest.Mocked<ListLocationsUseCase>;
    updateLocationUseCase = { execute: jest.fn() } as unknown as jest.Mocked<UpdateLocationUseCase>;

    const moduleRef = await Test.createTestingModule({
      controllers: [LocationsController],
      providers: [
        { provide: CreateLocationUseCase, useValue: createLocationUseCase },
        { provide: ListLocationsUseCase, useValue: listLocationsUseCase },
        { provide: UpdateLocationUseCase, useValue: updateLocationUseCase },
      ],
    }).compile();

    controller = moduleRef.get(LocationsController);
  });

  it('list() delegates to ListLocationsUseCase with the query', async () => {
    const expected = { items: [], total: 0, page: 1, pageSize: 20 };
    listLocationsUseCase.execute.mockResolvedValue(expected);

    const query = { page: 1, pageSize: 20 };
    const result = await controller.list(query);

    expect(listLocationsUseCase.execute).toHaveBeenCalledWith(query);
    expect(result).toBe(expected);
  });

  it('create() delegates to CreateLocationUseCase with the DTO', async () => {
    const expected = { id: '1', name: 'Sede Central', parentId: null, status: 'active' as const };
    createLocationUseCase.execute.mockResolvedValue(expected);

    const dto = { name: 'Sede Central' };
    const result = await controller.create(dto);

    expect(createLocationUseCase.execute).toHaveBeenCalledWith(dto);
    expect(result).toBe(expected);
  });

  it('update() delegates to UpdateLocationUseCase with id and DTO', async () => {
    const expected = { id: '1', name: 'Sede Central', parentId: null, status: 'inactive' as const };
    updateLocationUseCase.execute.mockResolvedValue(expected);

    const result = await controller.update('1', { status: 'inactive' });

    expect(updateLocationUseCase.execute).toHaveBeenCalledWith('1', { status: 'inactive' });
    expect(result).toBe(expected);
  });
});
