import { ConflictException } from '@nestjs/common';
import { CreateDocumentTypeUseCase } from './create-document-type.use-case';
import { DocumentTypePrismaRepository } from '../../infrastructure/document-type.prisma.repository';

describe('CreateDocumentTypeUseCase', () => {
  let useCase: CreateDocumentTypeUseCase;
  let repository: jest.Mocked<DocumentTypePrismaRepository>;

  beforeEach(() => {
    repository = {
      findAllPaginated: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<DocumentTypePrismaRepository>;
    useCase = new CreateDocumentTypeUseCase(repository);
  });

  it('creates a document type and returns it mapped to a DTO', async () => {
    repository.create.mockResolvedValue({ id: '1', name: 'NIT', status: 'active' });

    const result = await useCase.execute({ name: 'NIT' });

    expect(repository.create).toHaveBeenCalledWith('NIT');
    expect(result).toEqual({ id: '1', name: 'NIT', status: 'active' });
  });

  it('throws ConflictException when a document type with that name already exists', async () => {
    repository.create.mockRejectedValue({ code: 'P2002' });

    await expect(useCase.execute({ name: 'NIT' })).rejects.toThrow(ConflictException);
  });
});
