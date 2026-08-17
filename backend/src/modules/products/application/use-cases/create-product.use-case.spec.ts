import { BadRequestException } from '@nestjs/common';
import { CreateProductUseCase } from './create-product.use-case';
import { ProductPrismaRepository } from '../../infrastructure/product.prisma.repository';

describe('CreateProductUseCase', () => {
  let useCase: CreateProductUseCase;
  let repository: jest.Mocked<ProductPrismaRepository>;

  const unit = { id: 'unit-1', name: 'Kilogramo', status: 'active' as const };

  beforeEach(() => {
    repository = {
      findAllPaginated: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<ProductPrismaRepository>;
    useCase = new CreateProductUseCase(repository);
  });

  it('creates a product and returns it mapped to a DTO', async () => {
    repository.create.mockResolvedValue({
      id: '1',
      name: 'Arroz',
      description: null,
      unitId: 'unit-1',
      unit,
      categoryId: null,
      category: null,
      requiresBatch: false,
      imageUrl: null,
      status: 'active',
    });

    const result = await useCase.execute({ name: 'Arroz', unitId: 'unit-1' });

    expect(repository.create).toHaveBeenCalledWith({
      name: 'Arroz',
      description: undefined,
      unitId: 'unit-1',
      categoryId: undefined,
    });
    expect(result).toEqual({
      id: '1',
      name: 'Arroz',
      description: null,
      unit,
      category: null,
      requiresBatch: false,
      imageUrl: null,
      status: 'active',
    });
  });

  it('passes requiresBatch through to the repository when provided', async () => {
    repository.create.mockResolvedValue({
      id: '2',
      name: 'Yogur',
      description: null,
      unitId: 'unit-1',
      unit,
      categoryId: null,
      category: null,
      requiresBatch: true,
      imageUrl: null,
      status: 'active',
    });

    const result = await useCase.execute({ name: 'Yogur', unitId: 'unit-1', requiresBatch: true });

    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ requiresBatch: true }));
    expect(result.requiresBatch).toBe(true);
  });

  it('throws BadRequestException when unitId or categoryId does not exist (P2003)', async () => {
    repository.create.mockRejectedValue({ code: 'P2003' });

    await expect(useCase.execute({ name: 'Arroz', unitId: 'missing' })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rethrows any other error unchanged', async () => {
    const unexpected = new Error('database is down');
    repository.create.mockRejectedValue(unexpected);

    await expect(useCase.execute({ name: 'Arroz', unitId: 'unit-1' })).rejects.toThrow(unexpected);
  });
});
