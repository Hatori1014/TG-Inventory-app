import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { GetRequestUseCase } from './get-request.use-case';
import { RequestPrismaRepository } from '../../infrastructure/request.prisma.repository';

describe('GetRequestUseCase', () => {
  let useCase: GetRequestUseCase;
  let repository: jest.Mocked<RequestPrismaRepository>;

  const baseRequest = {
    id: 'request-1',
    type: 'purchase',
    status: 'draft',
    requesterId: 'user-1',
    requester: { id: 'user-1', name: 'Ana' },
    supplierId: null,
    supplier: null,
    purchaseId: null,
    createdAt: new Date(),
    resolvedAt: null,
    notes: null,
    items: [],
    approvals: [],
  };

  beforeEach(() => {
    repository = {
      findById: jest.fn(),
      userHasPermission: jest.fn().mockResolvedValue(false),
    } as unknown as jest.Mocked<RequestPrismaRepository>;
    useCase = new GetRequestUseCase(repository);
  });

  it('throws NotFoundException when the request does not exist', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(useCase.execute('missing', 'user-1')).rejects.toThrow(NotFoundException);
  });

  it('throws ForbiddenException when the caller is not the requester and has no relevant permission', async () => {
    repository.findById.mockResolvedValue(baseRequest as never);

    await expect(useCase.execute('request-1', 'someone-else')).rejects.toThrow(ForbiddenException);
  });

  it('returns the request for its own requester', async () => {
    repository.findById.mockResolvedValue(baseRequest as never);

    const result = await useCase.execute('request-1', 'user-1');

    expect(result.id).toBe('request-1');
  });

  it('returns a pending request for a caller with requests:approve', async () => {
    repository.findById.mockResolvedValue({ ...baseRequest, status: 'pending' } as never);
    repository.userHasPermission.mockResolvedValue(true);

    const result = await useCase.execute('request-1', 'approver-1');

    expect(repository.userHasPermission).toHaveBeenCalledWith('approver-1', 'requests', 'approve');
    expect(result.id).toBe('request-1');
  });

  it('returns an in_review request for a caller with requests:approve', async () => {
    repository.findById.mockResolvedValue({ ...baseRequest, status: 'in_review' } as never);
    repository.userHasPermission.mockResolvedValue(true);

    const result = await useCase.execute('request-1', 'approver-1');

    expect(result.id).toBe('request-1');
  });

  it('throws ForbiddenException for a pending request when the caller lacks requests:approve', async () => {
    repository.findById.mockResolvedValue({ ...baseRequest, status: 'pending' } as never);
    repository.userHasPermission.mockResolvedValue(false);

    await expect(useCase.execute('request-1', 'someone-else')).rejects.toThrow(ForbiddenException);
  });

  it('returns a pending_inventory_integration request for a caller with requests:integrate', async () => {
    repository.findById.mockResolvedValue({ ...baseRequest, status: 'pending_inventory_integration' } as never);
    repository.userHasPermission.mockResolvedValue(true);

    const result = await useCase.execute('request-1', 'admin-1');

    expect(repository.userHasPermission).toHaveBeenCalledWith('admin-1', 'requests', 'integrate');
    expect(result.id).toBe('request-1');
  });
});
