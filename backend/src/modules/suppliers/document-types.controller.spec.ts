import { Test } from '@nestjs/testing';
import { DocumentTypesController } from './document-types.controller';
import { CreateDocumentTypeUseCase } from './application/use-cases/create-document-type.use-case';
import { ListDocumentTypesUseCase } from './application/use-cases/list-document-types.use-case';
import { UpdateDocumentTypeUseCase } from './application/use-cases/update-document-type.use-case';

describe('DocumentTypesController', () => {
  let controller: DocumentTypesController;
  let createDocumentTypeUseCase: jest.Mocked<CreateDocumentTypeUseCase>;
  let listDocumentTypesUseCase: jest.Mocked<ListDocumentTypesUseCase>;
  let updateDocumentTypeUseCase: jest.Mocked<UpdateDocumentTypeUseCase>;

  beforeEach(async () => {
    createDocumentTypeUseCase = { execute: jest.fn() } as unknown as jest.Mocked<CreateDocumentTypeUseCase>;
    listDocumentTypesUseCase = { execute: jest.fn() } as unknown as jest.Mocked<ListDocumentTypesUseCase>;
    updateDocumentTypeUseCase = { execute: jest.fn() } as unknown as jest.Mocked<UpdateDocumentTypeUseCase>;

    const moduleRef = await Test.createTestingModule({
      controllers: [DocumentTypesController],
      providers: [
        { provide: CreateDocumentTypeUseCase, useValue: createDocumentTypeUseCase },
        { provide: ListDocumentTypesUseCase, useValue: listDocumentTypesUseCase },
        { provide: UpdateDocumentTypeUseCase, useValue: updateDocumentTypeUseCase },
      ],
    }).compile();

    controller = moduleRef.get(DocumentTypesController);
  });

  it('list() delegates to ListDocumentTypesUseCase with the query', async () => {
    const expected = { items: [], total: 0, page: 1, pageSize: 20 };
    listDocumentTypesUseCase.execute.mockResolvedValue(expected);

    const query = { page: 1, pageSize: 20 };
    const result = await controller.list(query);

    expect(listDocumentTypesUseCase.execute).toHaveBeenCalledWith(query);
    expect(result).toBe(expected);
  });

  it('create() delegates to CreateDocumentTypeUseCase with the DTO', async () => {
    const expected = { id: '1', name: 'NIT', status: 'active' as const };
    createDocumentTypeUseCase.execute.mockResolvedValue(expected);

    const dto = { name: 'NIT' };
    const result = await controller.create(dto);

    expect(createDocumentTypeUseCase.execute).toHaveBeenCalledWith(dto);
    expect(result).toBe(expected);
  });

  it('update() delegates to UpdateDocumentTypeUseCase with id and DTO', async () => {
    const expected = { id: '1', name: 'NIT', status: 'inactive' as const };
    updateDocumentTypeUseCase.execute.mockResolvedValue(expected);

    const result = await controller.update('1', { status: 'inactive' });

    expect(updateDocumentTypeUseCase.execute).toHaveBeenCalledWith('1', { status: 'inactive' });
    expect(result).toBe(expected);
  });
});
