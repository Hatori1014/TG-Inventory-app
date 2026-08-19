import { BadRequestException, ConflictException } from '@nestjs/common';
import { CreateSupplierUseCase } from './create-supplier.use-case';
import { SupplierPrismaRepository } from '../../infrastructure/supplier.prisma.repository';

describe('CreateSupplierUseCase', () => {
  let useCase: CreateSupplierUseCase;
  let repository: jest.Mocked<SupplierPrismaRepository>;

  beforeEach(() => {
    repository = {
      findAllPaginated: jest.fn(),
      findById: jest.fn(),
      findActiveByTaxId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<SupplierPrismaRepository>;
    useCase = new CreateSupplierUseCase(repository);
  });

  it('creates a supplier with only the required name and returns it mapped to a DTO', async () => {
    repository.create.mockResolvedValue({
      id: '1',
      name: 'Acme Corp',
      taxId: null,
      documentTypeId: null,
      documentType: null,
      personTypeId: null,
      personType: null,
      contact: null,
      phone: null,
      email: null,
      status: 'active',
    });

    const result = await useCase.execute({ name: 'Acme Corp' });

    expect(repository.findActiveByTaxId).not.toHaveBeenCalled();
    expect(repository.create).toHaveBeenCalledWith({
      name: 'Acme Corp',
      taxId: undefined,
      documentTypeId: undefined,
      personTypeId: undefined,
      contact: undefined,
      phone: undefined,
      email: undefined,
    });
    expect(result.id).toBe('1');
    expect(result.documentType).toBeNull();
  });

  it('creates a supplier with a tax ID and document type when no active supplier of that type already has it', async () => {
    repository.findActiveByTaxId.mockResolvedValue(null);
    repository.create.mockResolvedValue({
      id: '2',
      name: 'Beta SA',
      taxId: 'NIT-123',
      documentTypeId: 'doc-nit',
      documentType: { id: 'doc-nit', name: 'NIT', status: 'active' },
      personTypeId: null,
      personType: null,
      contact: null,
      phone: null,
      email: null,
      status: 'active',
    });

    const result = await useCase.execute({ name: 'Beta SA', taxId: 'NIT-123', documentTypeId: 'doc-nit' });

    expect(repository.findActiveByTaxId).toHaveBeenCalledWith('NIT-123', 'doc-nit');
    expect(result.taxId).toBe('NIT-123');
    expect(result.documentType?.name).toBe('NIT');
  });

  it('throws ConflictException when an active supplier of the same document type already has that tax ID', async () => {
    repository.findActiveByTaxId.mockResolvedValue({
      id: 'existing',
      name: 'Beta SA',
      taxId: 'NIT-123',
      documentTypeId: 'doc-nit',
      documentType: { id: 'doc-nit', name: 'NIT', status: 'active' },
      personTypeId: null,
      personType: null,
      contact: null,
      phone: null,
      email: null,
      status: 'active',
    });

    await expect(
      useCase.execute({ name: 'Beta SA Duplicada', taxId: 'NIT-123', documentTypeId: 'doc-nit' }),
    ).rejects.toThrow(ConflictException);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('does not check for a duplicate across different document types (a Cédula and a NIT with the same digits are not a collision)', async () => {
    repository.findActiveByTaxId.mockResolvedValue(null);
    repository.create.mockResolvedValue({
      id: '3',
      name: 'Juan Pérez',
      taxId: '123456',
      documentTypeId: 'doc-cc',
      documentType: { id: 'doc-cc', name: 'Cédula de ciudadanía', status: 'active' },
      personTypeId: null,
      personType: null,
      contact: null,
      phone: null,
      email: null,
      status: 'active',
    });

    await useCase.execute({ name: 'Juan Pérez', taxId: '123456', documentTypeId: 'doc-cc' });

    expect(repository.findActiveByTaxId).toHaveBeenCalledWith('123456', 'doc-cc');
  });

  it('throws ConflictException when the DB partial unique index catches a race (P2002)', async () => {
    repository.findActiveByTaxId.mockResolvedValue(null);
    repository.create.mockRejectedValue({ code: 'P2002' });

    await expect(useCase.execute({ name: 'Beta SA', taxId: 'NIT-123' })).rejects.toThrow(ConflictException);
  });

  it('throws BadRequestException when documentTypeId/personTypeId does not exist (P2003)', async () => {
    repository.create.mockRejectedValue({ code: 'P2003' });

    await expect(useCase.execute({ name: 'Beta SA', documentTypeId: 'missing' })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rethrows any other error unchanged', async () => {
    const unexpected = new Error('database is down');
    repository.create.mockRejectedValue(unexpected);

    await expect(useCase.execute({ name: 'Acme Corp' })).rejects.toThrow(unexpected);
  });
});
