import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { UpdateCategoryUseCase } from './update-category.use-case';
import { CategoryPrismaRepository } from '../../infrastructure/category.prisma.repository';

describe('UpdateCategoryUseCase', () => {
  let useCase: UpdateCategoryUseCase;
  let repository: jest.Mocked<CategoryPrismaRepository>;

  beforeEach(() => {
    repository = {
      findAllPaginated: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<CategoryPrismaRepository>;
    useCase = new UpdateCategoryUseCase(repository);
  });

  it('throws BadRequestException when no field is provided', async () => {
    await expect(useCase.execute('1', {})).rejects.toThrow(BadRequestException);
    expect(repository.findById).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when the category does not exist', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(useCase.execute('missing', { status: 'inactive' })).rejects.toThrow(NotFoundException);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('throws ConflictException when the new name already exists (P2002)', async () => {
    repository.findById.mockResolvedValue({ id: '1', name: 'Alimentos', status: 'active' });
    repository.update.mockRejectedValue({ code: 'P2002' });

    await expect(useCase.execute('1', { name: 'Bebidas' })).rejects.toThrow(ConflictException);
  });

  it('updates the category and returns it mapped to a DTO', async () => {
    repository.findById.mockResolvedValue({ id: '1', name: 'Alimentos', status: 'active' });
    repository.update.mockResolvedValue({ id: '1', name: 'Alimentos', status: 'inactive' });

    const result = await useCase.execute('1', { status: 'inactive' });

    expect(repository.update).toHaveBeenCalledWith('1', { status: 'inactive' });
    expect(result.status).toBe('inactive');
  });
});
