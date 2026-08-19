import { Test } from '@nestjs/testing';
import { PersonTypesController } from './person-types.controller';
import { CreatePersonTypeUseCase } from './application/use-cases/create-person-type.use-case';
import { ListPersonTypesUseCase } from './application/use-cases/list-person-types.use-case';
import { UpdatePersonTypeUseCase } from './application/use-cases/update-person-type.use-case';

describe('PersonTypesController', () => {
  let controller: PersonTypesController;
  let createPersonTypeUseCase: jest.Mocked<CreatePersonTypeUseCase>;
  let listPersonTypesUseCase: jest.Mocked<ListPersonTypesUseCase>;
  let updatePersonTypeUseCase: jest.Mocked<UpdatePersonTypeUseCase>;

  beforeEach(async () => {
    createPersonTypeUseCase = { execute: jest.fn() } as unknown as jest.Mocked<CreatePersonTypeUseCase>;
    listPersonTypesUseCase = { execute: jest.fn() } as unknown as jest.Mocked<ListPersonTypesUseCase>;
    updatePersonTypeUseCase = { execute: jest.fn() } as unknown as jest.Mocked<UpdatePersonTypeUseCase>;

    const moduleRef = await Test.createTestingModule({
      controllers: [PersonTypesController],
      providers: [
        { provide: CreatePersonTypeUseCase, useValue: createPersonTypeUseCase },
        { provide: ListPersonTypesUseCase, useValue: listPersonTypesUseCase },
        { provide: UpdatePersonTypeUseCase, useValue: updatePersonTypeUseCase },
      ],
    }).compile();

    controller = moduleRef.get(PersonTypesController);
  });

  it('list() delegates to ListPersonTypesUseCase with the query', async () => {
    const expected = { items: [], total: 0, page: 1, pageSize: 20 };
    listPersonTypesUseCase.execute.mockResolvedValue(expected);

    const query = { page: 1, pageSize: 20 };
    const result = await controller.list(query);

    expect(listPersonTypesUseCase.execute).toHaveBeenCalledWith(query);
    expect(result).toBe(expected);
  });

  it('create() delegates to CreatePersonTypeUseCase with the DTO', async () => {
    const expected = { id: '1', name: 'Natural', status: 'active' as const };
    createPersonTypeUseCase.execute.mockResolvedValue(expected);

    const dto = { name: 'Natural' };
    const result = await controller.create(dto);

    expect(createPersonTypeUseCase.execute).toHaveBeenCalledWith(dto);
    expect(result).toBe(expected);
  });

  it('update() delegates to UpdatePersonTypeUseCase with id and DTO', async () => {
    const expected = { id: '1', name: 'Natural', status: 'inactive' as const };
    updatePersonTypeUseCase.execute.mockResolvedValue(expected);

    const result = await controller.update('1', { status: 'inactive' });

    expect(updatePersonTypeUseCase.execute).toHaveBeenCalledWith('1', { status: 'inactive' });
    expect(result).toBe(expected);
  });
});
