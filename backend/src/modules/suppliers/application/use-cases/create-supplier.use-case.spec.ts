import { ConflictException } from '@nestjs/common';
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
      contact: undefined,
      phone: undefined,
      email: undefined,
    });
    expect(result.id).toBe('1');
  });

  it('creates a supplier with a tax ID when no active supplier already has it', async () => {
    repository.findActiveByTaxId.mockResolvedValue(null);
    repository.create.mockResolvedValue({
      id: '2',
      name: 'Beta SA',
      taxId: 'NIT-123',
      contact: null,
      phone: null,
      email: null,
      status: 'active',
    });

    const result = await useCase.execute({ name: 'Beta SA', taxId: 'NIT-123' });

    expect(repository.findActiveByTaxId).toHaveBeenCalledWith('NIT-123');
    expect(result.taxId).toBe('NIT-123');
  });

  it('throws ConflictException when an active supplier already has that tax ID', async () => {
    repository.findActiveByTaxId.mockResolvedValue({
      id: 'existing',
      name: 'Beta SA',
      taxId: 'NIT-123',
      contact: null,
      phone: null,
      email: null,
      status: 'active',
    });

    await expect(useCase.execute({ name: 'Beta SA Duplicada', taxId: 'NIT-123' })).rejects.toThrow(
      ConflictException,
    );
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('throws ConflictException when the DB partial unique index catches a race (P2002)', async () => {
    repository.findActiveByTaxId.mockResolvedValue(null);
    repository.create.mockRejectedValue({ code: 'P2002' });

    await expect(useCase.execute({ name: 'Beta SA', taxId: 'NIT-123' })).rejects.toThrow(ConflictException);
  });

  it('rethrows any other error unchanged', async () => {
    const unexpected = new Error('database is down');
    repository.create.mockRejectedValue(unexpected);

    await expect(useCase.execute({ name: 'Acme Corp' })).rejects.toThrow(unexpected);
  });
});
