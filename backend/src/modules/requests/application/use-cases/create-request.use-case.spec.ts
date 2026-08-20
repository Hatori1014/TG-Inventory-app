import { BadRequestException } from '@nestjs/common';
import { CreateRequestUseCase } from './create-request.use-case';
import { RequestPrismaRepository } from '../../infrastructure/request.prisma.repository';
import { CreateRequestDto } from '../../dto/create-request.dto';

describe('CreateRequestUseCase', () => {
  let useCase: CreateRequestUseCase;
  let repository: jest.Mocked<RequestPrismaRepository>;

  const requestWithRelations = {
    id: 'request-1',
    type: 'purchase',
    status: 'pending',
    requesterId: 'user-1',
    requester: { id: 'user-1', name: 'Ana' },
    supplierId: 'supplier-1',
    supplier: { id: 'supplier-1', name: 'Acme' },
    createdAt: new Date('2026-08-20'),
    resolvedAt: null,
    notes: null,
    items: [],
  };

  beforeEach(() => {
    repository = {
      findSupplierStatus: jest.fn(),
      findProductName: jest.fn(),
      findLocationStatus: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<RequestPrismaRepository>;
    useCase = new CreateRequestUseCase(repository);
  });

  const oneItem = [{ productId: 'p1', locationId: 'l1', quantity: 5 }];

  describe('saving as a draft', () => {
    it('saves a draft with no supplier and no items', async () => {
      repository.create.mockResolvedValue({ ...requestWithRelations, status: 'draft', supplierId: null, supplier: null } as never);

      const dto: CreateRequestDto = { type: 'purchase', saveAsDraft: true };
      await useCase.execute('user-1', dto);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'draft', requesterId: 'user-1', items: [] }),
      );
    });

    it('still validates item references even when saving as a draft', async () => {
      repository.findProductName.mockResolvedValue(null);

      const dto: CreateRequestDto = { type: 'purchase', saveAsDraft: true, items: oneItem };

      await expect(useCase.execute('user-1', dto)).rejects.toThrow(BadRequestException);
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('submitting directly (not a draft)', () => {
    it('rejects when there is no supplier', async () => {
      const dto: CreateRequestDto = { type: 'purchase', items: oneItem };

      await expect(useCase.execute('user-1', dto)).rejects.toThrow(BadRequestException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('rejects when there are no items', async () => {
      repository.findSupplierStatus.mockResolvedValue('active');

      const dto: CreateRequestDto = { type: 'purchase', supplierId: 'supplier-1' };

      await expect(useCase.execute('user-1', dto)).rejects.toThrow(BadRequestException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('rejects when the supplier does not exist', async () => {
      repository.findSupplierStatus.mockResolvedValue(null);

      const dto: CreateRequestDto = { type: 'purchase', supplierId: 'missing', items: oneItem };

      await expect(useCase.execute('user-1', dto)).rejects.toThrow(BadRequestException);
    });

    it('rejects when the supplier is inactive', async () => {
      repository.findSupplierStatus.mockResolvedValue('inactive');
      repository.findProductName.mockResolvedValue('Arroz');
      repository.findLocationStatus.mockResolvedValue('active');

      const dto: CreateRequestDto = { type: 'purchase', supplierId: 'supplier-1', items: oneItem };

      await expect(useCase.execute('user-1', dto)).rejects.toThrow(BadRequestException);
    });

    it('rejects when an item references a product that does not exist', async () => {
      repository.findSupplierStatus.mockResolvedValue('active');
      repository.findProductName.mockResolvedValue(null);

      const dto: CreateRequestDto = { type: 'purchase', supplierId: 'supplier-1', items: oneItem };

      await expect(useCase.execute('user-1', dto)).rejects.toThrow(BadRequestException);
    });

    it('rejects when an item references an inactive location', async () => {
      repository.findSupplierStatus.mockResolvedValue('active');
      repository.findProductName.mockResolvedValue('Arroz');
      repository.findLocationStatus.mockResolvedValue('inactive');

      const dto: CreateRequestDto = { type: 'purchase', supplierId: 'supplier-1', items: oneItem };

      await expect(useCase.execute('user-1', dto)).rejects.toThrow(BadRequestException);
    });

    it('creates the request as pending when everything is valid', async () => {
      repository.findSupplierStatus.mockResolvedValue('active');
      repository.findProductName.mockResolvedValue('Arroz');
      repository.findLocationStatus.mockResolvedValue('active');
      repository.create.mockResolvedValue(requestWithRelations as never);

      const dto: CreateRequestDto = { type: 'purchase', supplierId: 'supplier-1', items: oneItem };
      const result = await useCase.execute('user-1', dto);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'pending', supplierId: 'supplier-1', requesterId: 'user-1' }),
      );
      expect(result.id).toBe('request-1');
    });
  });
});
