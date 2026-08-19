import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { UpdateSupplierUseCase } from './update-supplier.use-case';
import { SupplierPrismaRepository } from '../../infrastructure/supplier.prisma.repository';

describe('UpdateSupplierUseCase', () => {
  let useCase: UpdateSupplierUseCase;
  let repository: jest.Mocked<SupplierPrismaRepository>;

  const existingSupplier = {
    id: '1',
    name: 'Acme Corp',
    taxId: 'NIT-123',
    documentTypeId: 'doc-nit',
    documentType: { id: 'doc-nit', name: 'NIT', status: 'active' as const },
    personTypeId: null,
    personType: null,
    contact: null,
    phone: null,
    email: null,
    status: 'active' as const,
  };

  beforeEach(() => {
    repository = {
      findAllPaginated: jest.fn(),
      findById: jest.fn(),
      findActiveByTaxId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<SupplierPrismaRepository>;
    useCase = new UpdateSupplierUseCase(repository);
  });

  it('throws BadRequestException when no fields are provided', async () => {
    await expect(useCase.execute('1', {})).rejects.toThrow(BadRequestException);
    expect(repository.findById).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when the supplier does not exist', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(useCase.execute('missing', { status: 'inactive' })).rejects.toThrow(NotFoundException);
  });

  it('deactivates a supplier that has purchases associated — status toggle, never a delete', async () => {
    repository.findById.mockResolvedValue(existingSupplier);
    repository.update.mockResolvedValue({ ...existingSupplier, status: 'inactive' });

    const result = await useCase.execute('1', { status: 'inactive' });

    expect(repository.findActiveByTaxId).not.toHaveBeenCalled();
    expect(repository.update).toHaveBeenCalledWith('1', { status: 'inactive' });
    expect(result.status).toBe('inactive');
  });

  it('allows keeping its own tax ID and document type without triggering its own duplicate check', async () => {
    repository.findById.mockResolvedValue(existingSupplier);
    repository.findActiveByTaxId.mockResolvedValue(existingSupplier);
    repository.update.mockResolvedValue({ ...existingSupplier, contact: 'Jane Doe' });

    await useCase.execute('1', { taxId: 'NIT-123', documentTypeId: 'doc-nit', contact: 'Jane Doe' });

    expect(repository.update).toHaveBeenCalledWith('1', {
      taxId: 'NIT-123',
      documentTypeId: 'doc-nit',
      contact: 'Jane Doe',
    });
  });

  it('throws ConflictException when the new tax ID collides with another active supplier of the same document type', async () => {
    repository.findById.mockResolvedValue(existingSupplier);
    repository.findActiveByTaxId.mockResolvedValue({ ...existingSupplier, id: 'other', taxId: 'NIT-999' });

    await expect(useCase.execute('1', { taxId: 'NIT-999' })).rejects.toThrow(ConflictException);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('checks for a tax ID collision when reactivating a supplier, not just when changing the tax ID', async () => {
    const inactiveSupplier = { ...existingSupplier, status: 'inactive' as const };
    repository.findById.mockResolvedValue(inactiveSupplier);
    repository.findActiveByTaxId.mockResolvedValue({ ...existingSupplier, id: 'other' });

    await expect(useCase.execute('1', { status: 'active' })).rejects.toThrow(ConflictException);
    expect(repository.findActiveByTaxId).toHaveBeenCalledWith('NIT-123', 'doc-nit');
  });

  it('checks for a collision under the new document type when only documentTypeId changes', async () => {
    repository.findById.mockResolvedValue(existingSupplier);
    repository.findActiveByTaxId.mockResolvedValue({ ...existingSupplier, id: 'other', documentTypeId: 'doc-cc' });

    await expect(useCase.execute('1', { documentTypeId: 'doc-cc' })).rejects.toThrow(ConflictException);
    expect(repository.findActiveByTaxId).toHaveBeenCalledWith('NIT-123', 'doc-cc');
  });

  it('does not check for a collision when deactivating even if taxId is also sent', async () => {
    repository.findById.mockResolvedValue(existingSupplier);
    repository.update.mockResolvedValue({ ...existingSupplier, status: 'inactive' });

    await useCase.execute('1', { taxId: 'NIT-123', status: 'inactive' });

    expect(repository.findActiveByTaxId).not.toHaveBeenCalled();
  });

  it('throws ConflictException when the DB partial unique index catches a race (P2002)', async () => {
    repository.findById.mockResolvedValue(existingSupplier);
    repository.findActiveByTaxId.mockResolvedValue(null);
    repository.update.mockRejectedValue({ code: 'P2002' });

    await expect(useCase.execute('1', { taxId: 'NIT-999' })).rejects.toThrow(ConflictException);
  });

  it('throws BadRequestException when the new documentTypeId/personTypeId does not exist (P2003)', async () => {
    repository.findById.mockResolvedValue(existingSupplier);
    repository.update.mockRejectedValue({ code: 'P2003' });

    await expect(useCase.execute('1', { personTypeId: 'missing' })).rejects.toThrow(BadRequestException);
  });
});
