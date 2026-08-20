import { ListDocumentTypesUseCase } from './list-document-types.use-case';
import { DocumentTypePrismaRepository } from '../../infrastructure/document-type.prisma.repository';

describe('ListDocumentTypesUseCase', () => {
  let useCase: ListDocumentTypesUseCase;
  let repository: jest.Mocked<DocumentTypePrismaRepository>;

  beforeEach(() => {
    repository = {
      findAllPaginated: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<DocumentTypePrismaRepository>;
    useCase = new ListDocumentTypesUseCase(repository);
  });

  it('returns a paginated, mapped list of document types', async () => {
    repository.findAllPaginated.mockResolvedValue({
      items: [{ id: '1', name: 'NIT', status: 'active' }],
      total: 1,
    });

    const result = await useCase.execute({ page: 1, pageSize: 20 });

    expect(repository.findAllPaginated).toHaveBeenCalledWith(0, 20);
    expect(result).toEqual({
      items: [{ id: '1', name: 'NIT', status: 'active' }],
      total: 1,
      page: 1,
      pageSize: 20,
    });
  });
});
