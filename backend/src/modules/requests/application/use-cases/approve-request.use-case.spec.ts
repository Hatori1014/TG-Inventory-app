import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ApproveRequestUseCase } from './approve-request.use-case';
import { RequestPrismaRepository } from '../../infrastructure/request.prisma.repository';
import {
  AlreadyVotedError,
  RequestAlreadyResolvedError,
  RequestNotFoundError,
  SelfApprovalError,
} from '../../domain/request-approval.errors';
import { RecordAuditEventUseCase } from '../../../audit/application/use-cases/record-audit-event.use-case';

describe('ApproveRequestUseCase', () => {
  let useCase: ApproveRequestUseCase;
  let repository: jest.Mocked<RequestPrismaRepository>;
  let recordAuditEvent: jest.Mocked<RecordAuditEventUseCase>;

  const resolvedRequest = {
    id: 'request-1',
    type: 'purchase',
    status: 'in_review',
    requesterId: 'user-1',
    requester: { id: 'user-1', name: 'Ana' },
    supplierId: 'supplier-1',
    supplier: { id: 'supplier-1', name: 'Acme' },
    purchaseId: null,
    createdAt: new Date(),
    resolvedAt: null,
    notes: null,
    items: [],
    approvals: [],
  };

  beforeEach(() => {
    repository = {
      recordApprovalDecision: jest.fn(),
    } as unknown as jest.Mocked<RequestPrismaRepository>;
    recordAuditEvent = { execute: jest.fn() } as unknown as jest.Mocked<RecordAuditEventUseCase>;
    useCase = new ApproveRequestUseCase(repository, recordAuditEvent);
  });

  it('casts the vote, audits it, and returns the updated request when it succeeds on the first attempt', async () => {
    repository.recordApprovalDecision.mockResolvedValue(resolvedRequest as never);

    const result = await useCase.execute('request-1', 'approver-1', 'looks good');

    expect(repository.recordApprovalDecision).toHaveBeenCalledWith({
      requestId: 'request-1',
      approverId: 'approver-1',
      decision: 'approved',
      comment: 'looks good',
    });
    expect(recordAuditEvent.execute).toHaveBeenCalledWith({
      userId: 'approver-1',
      action: 'request.approve',
      entity: 'Request',
      entityId: 'request-1',
    });
    expect(result.id).toBe('request-1');
  });

  it('retries on a version conflict (concurrent approvers) via withOptimisticLock', async () => {
    repository.recordApprovalDecision.mockResolvedValueOnce(null).mockResolvedValueOnce(resolvedRequest as never);

    const result = await useCase.execute('request-1', 'approver-1', undefined);

    expect(repository.recordApprovalDecision).toHaveBeenCalledTimes(2);
    expect(result.id).toBe('request-1');
  });

  it('translates RequestNotFoundError to NotFoundException', async () => {
    repository.recordApprovalDecision.mockRejectedValue(new RequestNotFoundError());

    await expect(useCase.execute('missing', 'approver-1', undefined)).rejects.toThrow(NotFoundException);
  });

  it('translates SelfApprovalError to ForbiddenException', async () => {
    repository.recordApprovalDecision.mockRejectedValue(new SelfApprovalError());

    await expect(useCase.execute('request-1', 'user-1', undefined)).rejects.toThrow(ForbiddenException);
  });

  it('translates AlreadyVotedError to ConflictException', async () => {
    repository.recordApprovalDecision.mockRejectedValue(new AlreadyVotedError());

    await expect(useCase.execute('request-1', 'approver-1', undefined)).rejects.toThrow(ConflictException);
  });

  it('translates RequestAlreadyResolvedError to ConflictException', async () => {
    repository.recordApprovalDecision.mockRejectedValue(new RequestAlreadyResolvedError());

    await expect(useCase.execute('request-1', 'approver-1', undefined)).rejects.toThrow(ConflictException);
  });
});
