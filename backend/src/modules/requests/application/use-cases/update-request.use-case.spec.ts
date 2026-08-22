import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { UpdateRequestUseCase } from './update-request.use-case';
import { RequestPrismaRepository } from '../../infrastructure/request.prisma.repository';

describe('UpdateRequestUseCase', () => {
  let useCase: UpdateRequestUseCase;
  let repository: jest.Mocked<RequestPrismaRepository>;

  const draftRequest = {
    id: 'request-1',
    requesterId: 'user-1',
    status: 'draft',
  };

  beforeEach(() => {
    repository = {
      findById: jest.fn(),
      findSupplierStatus: jest.fn(),
      findProductName: jest.fn(),
      findLocationStatus: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<RequestPrismaRepository>;
    useCase = new UpdateRequestUseCase(repository);
  });

  it('throws NotFoundException when the request does not exist', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(useCase.execute('missing', 'user-1', {})).rejects.toThrow(NotFoundException);
  });

  it('throws ForbiddenException when the caller is not the requester', async () => {
    repository.findById.mockResolvedValue(draftRequest as never);

    await expect(useCase.execute('request-1', 'someone-else', {})).rejects.toThrow(ForbiddenException);
  });

  it('throws ConflictException when the request is not a draft', async () => {
    repository.findById.mockResolvedValue({ ...draftRequest, status: 'pending' } as never);

    await expect(useCase.execute('request-1', 'user-1', {})).rejects.toThrow(ConflictException);
  });

  it('rejects an item referencing a product that does not exist', async () => {
    repository.findById.mockResolvedValue(draftRequest as never);
    repository.findProductName.mockResolvedValue(null);

    await expect(
      useCase.execute('request-1', 'user-1', { items: [{ productId: 'p1', locationId: 'l1', quantity: 5 }] }),
    ).rejects.toThrow(BadRequestException);
  });

  it('updates the draft when everything is valid', async () => {
    repository.findById.mockResolvedValue(draftRequest as never);
    repository.findSupplierStatus.mockResolvedValue('active');
    repository.findProductName.mockResolvedValue('Arroz');
    repository.findLocationStatus.mockResolvedValue('active');
    repository.update.mockResolvedValue({
      id: 'request-1',
      type: 'purchase',
      status: 'draft',
      requesterId: 'user-1',
      requester: { id: 'user-1', name: 'Ana' },
      supplierId: 'supplier-1',
      supplier: { id: 'supplier-1', name: 'Acme' },
      createdAt: new Date(),
      resolvedAt: null,
      notes: null,
      items: [],
      approvals: [],
    } as never);

    const result = await useCase.execute('request-1', 'user-1', {
      supplierId: 'supplier-1',
      items: [{ productId: 'p1', locationId: 'l1', quantity: 5 }],
    });

    expect(repository.update).toHaveBeenCalledWith(
      'request-1',
      expect.objectContaining({ supplierId: 'supplier-1' }),
    );
    expect(result.supplierId).toBe('supplier-1');
  });
});
