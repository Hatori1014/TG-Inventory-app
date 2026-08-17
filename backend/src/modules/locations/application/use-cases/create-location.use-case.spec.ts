import { BadRequestException, ConflictException } from '@nestjs/common';
import { CreateLocationUseCase } from './create-location.use-case';
import { LocationPrismaRepository } from '../../infrastructure/location.prisma.repository';

describe('CreateLocationUseCase', () => {
  let useCase: CreateLocationUseCase;
  let repository: jest.Mocked<LocationPrismaRepository>;

  beforeEach(() => {
    repository = {
      findAllPaginated: jest.fn(),
      findById: jest.fn(),
      findByParentAndName: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<LocationPrismaRepository>;
    useCase = new CreateLocationUseCase(repository);
  });

  it('creates a root location (no parent) and returns it mapped to a DTO', async () => {
    repository.findByParentAndName.mockResolvedValue(null);
    repository.create.mockResolvedValue({ id: '1', name: 'Sede Central', parentId: null, status: 'active' });

    const result = await useCase.execute({ name: 'Sede Central' });

    expect(repository.findByParentAndName).toHaveBeenCalledWith(null, 'Sede Central');
    expect(repository.create).toHaveBeenCalledWith({ name: 'Sede Central', parentId: undefined });
    expect(result).toEqual({ id: '1', name: 'Sede Central', parentId: null, status: 'active' });
  });

  it('creates a child location under a parent', async () => {
    repository.findByParentAndName.mockResolvedValue(null);
    repository.create.mockResolvedValue({ id: '2', name: 'Sala A', parentId: '1', status: 'active' });

    const result = await useCase.execute({ name: 'Sala A', parentId: '1' });

    expect(repository.findByParentAndName).toHaveBeenCalledWith('1', 'Sala A');
    expect(result.parentId).toBe('1');
  });

  it('throws ConflictException when a location with the same name already exists under that parent', async () => {
    repository.findByParentAndName.mockResolvedValue({
      id: 'existing',
      name: 'Sala A',
      parentId: '1',
      status: 'active',
    });

    await expect(useCase.execute({ name: 'Sala A', parentId: '1' })).rejects.toThrow(ConflictException);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('throws ConflictException when the DB unique constraint is lost in a race (P2002)', async () => {
    repository.findByParentAndName.mockResolvedValue(null);
    repository.create.mockRejectedValue({ code: 'P2002' });

    await expect(useCase.execute({ name: 'Sala A', parentId: '1' })).rejects.toThrow(ConflictException);
  });

  it('throws BadRequestException when parentId does not exist (P2003)', async () => {
    repository.findByParentAndName.mockResolvedValue(null);
    repository.create.mockRejectedValue({ code: 'P2003' });

    await expect(useCase.execute({ name: 'Sala A', parentId: 'missing' })).rejects.toThrow(BadRequestException);
  });

  it('rethrows any other error unchanged', async () => {
    repository.findByParentAndName.mockResolvedValue(null);
    const unexpected = new Error('database is down');
    repository.create.mockRejectedValue(unexpected);

    await expect(useCase.execute({ name: 'Sala A' })).rejects.toThrow(unexpected);
  });
});
