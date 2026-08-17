import { ConflictException } from '@nestjs/common';
import { CreateCategoryUseCase } from './create-category.use-case';
import { CategoryPrismaRepository } from '../../infrastructure/category.prisma.repository';

describe('CreateCategoryUseCase', () => {
  let useCase: CreateCategoryUseCase;
  let repository: jest.Mocked<CategoryPrismaRepository>;

  beforeEach(() => {
    repository = {
      findAllPaginated: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<CategoryPrismaRepository>;
    useCase = new CreateCategoryUseCase(repository);
  });

  it('creates a category and returns it mapped to a DTO', async () => {
    repository.create.mockResolvedValue({ id: '1', name: 'Alimentos', status: 'active' });

    const result = await useCase.execute({ name: 'Alimentos' });

    expect(repository.create).toHaveBeenCalledWith('Alimentos');
    expect(result).toEqual({ id: '1', name: 'Alimentos', status: 'active' });
  });

  it('throws ConflictException when the category name already exists (P2002)', async () => {
    repository.create.mockRejectedValue({ code: 'P2002' });

    await expect(useCase.execute({ name: 'Alimentos' })).rejects.toThrow(ConflictException);
  });

  it('rethrows any other error unchanged', async () => {
    const unexpected = new Error('database is down');
    repository.create.mockRejectedValue(unexpected);

    await expect(useCase.execute({ name: 'Alimentos' })).rejects.toThrow(unexpected);
  });
});
