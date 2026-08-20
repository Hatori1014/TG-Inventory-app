import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { UpdateDocumentTypeUseCase } from './update-document-type.use-case';
import { DocumentTypePrismaRepository } from '../../infrastructure/document-type.prisma.repository';

describe('UpdateDocumentTypeUseCase', () => {
  let useCase: UpdateDocumentTypeUseCase;
  let repository: jest.Mocked<DocumentTypePrismaRepository>;

  const existing = { id: '1', name: 'NIT', status: 'active' as const };

  beforeEach(() => {
    repository = {
      findAllPaginated: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<DocumentTypePrismaRepository>;
    useCase = new UpdateDocumentTypeUseCase(repository);
  });

  it('throws BadRequestException when no fields are provided', async () => {
    await expect(useCase.execute('1', {})).rejects.toThrow(BadRequestException);
    expect(repository.findById).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when the document type does not exist', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(useCase.execute('missing', { status: 'inactive' })).rejects.toThrow(NotFoundException);
  });

  it('deactivates a document type', async () => {
    repository.findById.mockResolvedValue(existing);
    repository.update.mockResolvedValue({ ...existing, status: 'inactive' });

    const result = await useCase.execute('1', { status: 'inactive' });

    expect(repository.update).toHaveBeenCalledWith('1', { status: 'inactive' });
    expect(result.status).toBe('inactive');
  });

  it('throws ConflictException when the new name collides with another document type', async () => {
    repository.findById.mockResolvedValue(existing);
    repository.update.mockRejectedValue({ code: 'P2002' });

    await expect(useCase.execute('1', { name: 'Cédula de ciudadanía' })).rejects.toThrow(ConflictException);
  });
});
