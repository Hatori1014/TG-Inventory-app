import { Test } from '@nestjs/testing';
import { CategoriesController } from './categories.controller';
import { CreateCategoryUseCase } from './application/use-cases/create-category.use-case';
import { ListCategoriesUseCase } from './application/use-cases/list-categories.use-case';
import { UpdateCategoryUseCase } from './application/use-cases/update-category.use-case';

describe('CategoriesController', () => {
  let controller: CategoriesController;
  let createCategoryUseCase: jest.Mocked<CreateCategoryUseCase>;
  let listCategoriesUseCase: jest.Mocked<ListCategoriesUseCase>;
  let updateCategoryUseCase: jest.Mocked<UpdateCategoryUseCase>;

  beforeEach(async () => {
    createCategoryUseCase = { execute: jest.fn() } as unknown as jest.Mocked<CreateCategoryUseCase>;
    listCategoriesUseCase = { execute: jest.fn() } as unknown as jest.Mocked<ListCategoriesUseCase>;
    updateCategoryUseCase = { execute: jest.fn() } as unknown as jest.Mocked<UpdateCategoryUseCase>;

    const moduleRef = await Test.createTestingModule({
      controllers: [CategoriesController],
      providers: [
        { provide: CreateCategoryUseCase, useValue: createCategoryUseCase },
        { provide: ListCategoriesUseCase, useValue: listCategoriesUseCase },
        { provide: UpdateCategoryUseCase, useValue: updateCategoryUseCase },
      ],
    }).compile();

    controller = moduleRef.get(CategoriesController);
  });

  it('list() delegates to ListCategoriesUseCase with the query', async () => {
    const expected = { items: [], total: 0, page: 1, pageSize: 20 };
    listCategoriesUseCase.execute.mockResolvedValue(expected);

    const query = { page: 1, pageSize: 20 };
    const result = await controller.list(query);

    expect(listCategoriesUseCase.execute).toHaveBeenCalledWith(query);
    expect(result).toBe(expected);
  });

  it('create() delegates to CreateCategoryUseCase with the DTO', async () => {
    const expected = { id: '1', name: 'Alimentos', status: 'active' as const };
    createCategoryUseCase.execute.mockResolvedValue(expected);

    const dto = { name: 'Alimentos' };
    const result = await controller.create(dto);

    expect(createCategoryUseCase.execute).toHaveBeenCalledWith(dto);
    expect(result).toBe(expected);
  });

  it('update() delegates to UpdateCategoryUseCase with id and DTO', async () => {
    const expected = { id: '1', name: 'Alimentos', status: 'inactive' as const };
    updateCategoryUseCase.execute.mockResolvedValue(expected);

    const result = await controller.update('1', { status: 'inactive' });

    expect(updateCategoryUseCase.execute).toHaveBeenCalledWith('1', { status: 'inactive' });
    expect(result).toBe(expected);
  });
});
