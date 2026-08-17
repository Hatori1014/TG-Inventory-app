import { ConflictException } from '@nestjs/common';
import { CreateUnitUseCase } from './create-unit.use-case';
import { UnitPrismaRepository } from '../../infrastructure/unit.prisma.repository';

describe('CreateUnitUseCase', () => {
  let useCase: CreateUnitUseCase;
  let repository: jest.Mocked<UnitPrismaRepository>;

  beforeEach(() => {
    repository = {
      findAllPaginated: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<UnitPrismaRepository>;
    useCase = new CreateUnitUseCase(repository);
  });

  it('creates a unit and returns it mapped to a DTO', async () => {
    repository.create.mockResolvedValue({ id: '1', name: 'Kilogramo', status: 'active' });

    const result = await useCase.execute({ name: 'Kilogramo' });

    expect(repository.create).toHaveBeenCalledWith('Kilogramo');
    expect(result).toEqual({ id: '1', name: 'Kilogramo', status: 'active' });
  });

  it('throws ConflictException when the unit name already exists (P2002)', async () => {
    repository.create.mockRejectedValue({ code: 'P2002' });

    await expect(useCase.execute({ name: 'Kilogramo' })).rejects.toThrow(ConflictException);
  });

  it('rethrows any other error unchanged', async () => {
    const unexpected = new Error('database is down');
    repository.create.mockRejectedValue(unexpected);

    await expect(useCase.execute({ name: 'Kilogramo' })).rejects.toThrow(unexpected);
  });
});
