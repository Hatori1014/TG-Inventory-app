import { ConflictException } from '@nestjs/common';
import { CreatePersonTypeUseCase } from './create-person-type.use-case';
import { PersonTypePrismaRepository } from '../../infrastructure/person-type.prisma.repository';

describe('CreatePersonTypeUseCase', () => {
  let useCase: CreatePersonTypeUseCase;
  let repository: jest.Mocked<PersonTypePrismaRepository>;

  beforeEach(() => {
    repository = {
      findAllPaginated: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<PersonTypePrismaRepository>;
    useCase = new CreatePersonTypeUseCase(repository);
  });

  it('creates a person type and returns it mapped to a DTO', async () => {
    repository.create.mockResolvedValue({ id: '1', name: 'Natural', status: 'active' });

    const result = await useCase.execute({ name: 'Natural' });

    expect(repository.create).toHaveBeenCalledWith('Natural');
    expect(result).toEqual({ id: '1', name: 'Natural', status: 'active' });
  });

  it('throws ConflictException when a person type with that name already exists', async () => {
    repository.create.mockRejectedValue({ code: 'P2002' });

    await expect(useCase.execute({ name: 'Natural' })).rejects.toThrow(ConflictException);
  });
});
