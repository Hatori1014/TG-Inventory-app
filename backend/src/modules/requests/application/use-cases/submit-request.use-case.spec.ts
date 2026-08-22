import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { SubmitRequestUseCase } from './submit-request.use-case';
import { RequestPrismaRepository } from '../../infrastructure/request.prisma.repository';

describe('SubmitRequestUseCase', () => {
  let useCase: SubmitRequestUseCase;
  let repository: jest.Mocked<RequestPrismaRepository>;

  const draftWithSupplierAndItem = {
    id: 'request-1',
    requesterId: 'user-1',
    status: 'draft',
    supplierId: 'supplier-1',
    items: [{ productId: 'p1', locationId: 'l1', quantity: 5, estimatedPrice: null }],
  };

  beforeEach(() => {
    repository = {
      findById: jest.fn(),
      updateStatus: jest.fn(),
    } as unknown as jest.Mocked<RequestPrismaRepository>;
    useCase = new SubmitRequestUseCase(repository);
  });

  it('throws NotFoundException when the request does not exist', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(useCase.execute('missing', 'user-1')).rejects.toThrow(NotFoundException);
  });

  it('throws ForbiddenException when the caller is not the requester', async () => {
    repository.findById.mockResolvedValue(draftWithSupplierAndItem as never);

    await expect(useCase.execute('request-1', 'someone-else')).rejects.toThrow(ForbiddenException);
  });

  it('throws ConflictException when the request is not a draft', async () => {
    repository.findById.mockResolvedValue({ ...draftWithSupplierAndItem, status: 'pending' } as never);

    await expect(useCase.execute('request-1', 'user-1')).rejects.toThrow(ConflictException);
  });

  it('rejects submitting a draft with no supplier', async () => {
    repository.findById.mockResolvedValue({ ...draftWithSupplierAndItem, supplierId: null } as never);

    await expect(useCase.execute('request-1', 'user-1')).rejects.toThrow(BadRequestException);
    expect(repository.updateStatus).not.toHaveBeenCalled();
  });

  it('rejects submitting a draft with no items', async () => {
    repository.findById.mockResolvedValue({ ...draftWithSupplierAndItem, items: [] } as never);

    await expect(useCase.execute('request-1', 'user-1')).rejects.toThrow(BadRequestException);
  });

  it('submits a valid draft, transitioning it to pending', async () => {
    repository.findById.mockResolvedValue(draftWithSupplierAndItem as never);
    repository.updateStatus.mockResolvedValue({
      id: 'request-1',
      type: 'purchase',
      status: 'pending',
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

    const result = await useCase.execute('request-1', 'user-1');

    expect(repository.updateStatus).toHaveBeenCalledWith('request-1', 'pending');
    expect(result.status).toBe('pending');
  });
});
