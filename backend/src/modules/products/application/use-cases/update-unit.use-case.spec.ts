import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { UpdateUnitUseCase } from './update-unit.use-case';
import { UnitPrismaRepository } from '../../infrastructure/unit.prisma.repository';

describe('UpdateUnitUseCase', () => {
  let useCase: UpdateUnitUseCase;
  let repository: jest.Mocked<UnitPrismaRepository>;

  beforeEach(() => {
    repository = {
      findAllPaginated: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<UnitPrismaRepository>;
    useCase = new UpdateUnitUseCase(repository);
  });

  it('throws BadRequestException when no field is provided', async () => {
    await expect(useCase.execute('1', {})).rejects.toThrow(BadRequestException);
    expect(repository.findById).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when the unit does not exist', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(useCase.execute('missing', { status: 'inactive' })).rejects.toThrow(NotFoundException);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('throws ConflictException when the new name already exists (P2002)', async () => {
    repository.findById.mockResolvedValue({ id: '1', name: 'Kilogramo', status: 'active' });
    repository.update.mockRejectedValue({ code: 'P2002' });

    await expect(useCase.execute('1', { name: 'Litro' })).rejects.toThrow(ConflictException);
  });

  it('updates the unit and returns it mapped to a DTO', async () => {
    repository.findById.mockResolvedValue({ id: '1', name: 'Kilogramo', status: 'active' });
    repository.update.mockResolvedValue({ id: '1', name: 'Kilogramo', status: 'inactive' });

    const result = await useCase.execute('1', { status: 'inactive' });

    expect(repository.update).toHaveBeenCalledWith('1', { status: 'inactive' });
    expect(result.status).toBe('inactive');
  });
});
