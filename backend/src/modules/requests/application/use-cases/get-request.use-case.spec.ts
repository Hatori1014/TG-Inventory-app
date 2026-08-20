import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { GetRequestUseCase } from './get-request.use-case';
import { RequestPrismaRepository } from '../../infrastructure/request.prisma.repository';

describe('GetRequestUseCase', () => {
  let useCase: GetRequestUseCase;
  let repository: jest.Mocked<RequestPrismaRepository>;

  const request = {
    id: 'request-1',
    type: 'purchase',
    status: 'draft',
    requesterId: 'user-1',
    requester: { id: 'user-1', name: 'Ana' },
    supplierId: null,
    supplier: null,
    createdAt: new Date(),
    resolvedAt: null,
    notes: null,
    items: [],
  };

  beforeEach(() => {
    repository = { findById: jest.fn() } as unknown as jest.Mocked<RequestPrismaRepository>;
    useCase = new GetRequestUseCase(repository);
  });

  it('throws NotFoundException when the request does not exist', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(useCase.execute('missing', 'user-1')).rejects.toThrow(NotFoundException);
  });

  it('throws ForbiddenException when the caller is not the requester', async () => {
    repository.findById.mockResolvedValue(request as never);

    await expect(useCase.execute('request-1', 'someone-else')).rejects.toThrow(ForbiddenException);
  });

  it('returns the request for its own requester', async () => {
    repository.findById.mockResolvedValue(request as never);

    const result = await useCase.execute('request-1', 'user-1');

    expect(result.id).toBe('request-1');
  });
});
