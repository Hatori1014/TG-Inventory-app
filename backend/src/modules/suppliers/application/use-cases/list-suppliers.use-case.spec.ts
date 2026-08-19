import { ListSuppliersUseCase } from './list-suppliers.use-case';
import { SupplierPrismaRepository } from '../../infrastructure/supplier.prisma.repository';

describe('ListSuppliersUseCase', () => {
  let useCase: ListSuppliersUseCase;
  let repository: jest.Mocked<SupplierPrismaRepository>;

  beforeEach(() => {
    repository = {
      findAllPaginated: jest.fn(),
      findById: jest.fn(),
      findActiveByTaxId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<SupplierPrismaRepository>;
    useCase = new ListSuppliersUseCase(repository);
  });

  it('returns a paginated, mapped list of suppliers', async () => {
    repository.findAllPaginated.mockResolvedValue({
      items: [
        {
          id: '1',
          name: 'Acme Corp',
          taxId: 'NIT-123',
          contact: null,
          phone: null,
          email: null,
          status: 'active',
        },
      ],
      total: 1,
    });

    const result = await useCase.execute({ page: 1, pageSize: 20 });

    expect(repository.findAllPaginated).toHaveBeenCalledWith(0, 20);
    expect(result).toEqual({
      items: [
        {
          id: '1',
          name: 'Acme Corp',
          taxId: 'NIT-123',
          contact: null,
          phone: null,
          email: null,
          status: 'active',
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
    });
  });
});
