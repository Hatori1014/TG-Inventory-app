import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { UpdatePersonTypeUseCase } from './update-person-type.use-case';
import { PersonTypePrismaRepository } from '../../infrastructure/person-type.prisma.repository';

describe('UpdatePersonTypeUseCase', () => {
  let useCase: UpdatePersonTypeUseCase;
  let repository: jest.Mocked<PersonTypePrismaRepository>;

  const existing = { id: '1', name: 'Natural', status: 'active' as const };

  beforeEach(() => {
    repository = {
      findAllPaginated: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<PersonTypePrismaRepository>;
    useCase = new UpdatePersonTypeUseCase(repository);
  });

  it('throws BadRequestException when no fields are provided', async () => {
    await expect(useCase.execute('1', {})).rejects.toThrow(BadRequestException);
    expect(repository.findById).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when the person type does not exist', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(useCase.execute('missing', { status: 'inactive' })).rejects.toThrow(NotFoundException);
  });

  it('deactivates a person type', async () => {
    repository.findById.mockResolvedValue(existing);
    repository.update.mockResolvedValue({ ...existing, status: 'inactive' });

    const result = await useCase.execute('1', { status: 'inactive' });

    expect(repository.update).toHaveBeenCalledWith('1', { status: 'inactive' });
    expect(result.status).toBe('inactive');
  });

  it('throws ConflictException when the new name collides with another person type', async () => {
    repository.findById.mockResolvedValue(existing);
    repository.update.mockRejectedValue({ code: 'P2002' });

    await expect(useCase.execute('1', { name: 'Jurídica' })).rejects.toThrow(ConflictException);
  });
});
