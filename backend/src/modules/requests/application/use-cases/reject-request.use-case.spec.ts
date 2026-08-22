import { RejectRequestUseCase } from './reject-request.use-case';
import { RequestPrismaRepository } from '../../infrastructure/request.prisma.repository';
import { RecordAuditEventUseCase } from '../../../audit/application/use-cases/record-audit-event.use-case';

describe('RejectRequestUseCase', () => {
  let useCase: RejectRequestUseCase;
  let repository: jest.Mocked<RequestPrismaRepository>;
  let recordAuditEvent: jest.Mocked<RecordAuditEventUseCase>;

  const closedRequest = {
    id: 'request-1',
    type: 'purchase',
    status: 'closed',
    requesterId: 'user-1',
    requester: { id: 'user-1', name: 'Ana' },
    supplierId: 'supplier-1',
    supplier: { id: 'supplier-1', name: 'Acme' },
    purchaseId: null,
    createdAt: new Date(),
    resolvedAt: new Date(),
    notes: null,
    items: [],
    approvals: [
      {
        id: 'approval-1',
        approverId: 'approver-1',
        approver: { id: 'approver-1', name: 'Beto' },
        decision: 'rejected',
        comment: 'budget exceeded',
        decidedAt: new Date(),
      },
    ],
  };

  beforeEach(() => {
    repository = {
      recordApprovalDecision: jest.fn(),
    } as unknown as jest.Mocked<RequestPrismaRepository>;
    recordAuditEvent = { execute: jest.fn() } as unknown as jest.Mocked<RecordAuditEventUseCase>;
    useCase = new RejectRequestUseCase(repository, recordAuditEvent);
  });

  it('casts a rejection with the mandatory comment, audits it, and closes the request', async () => {
    repository.recordApprovalDecision.mockResolvedValue(closedRequest as never);

    const result = await useCase.execute('request-1', 'approver-1', 'budget exceeded');

    expect(repository.recordApprovalDecision).toHaveBeenCalledWith({
      requestId: 'request-1',
      approverId: 'approver-1',
      decision: 'rejected',
      comment: 'budget exceeded',
    });
    expect(recordAuditEvent.execute).toHaveBeenCalledWith({
      userId: 'approver-1',
      action: 'request.reject',
      entity: 'Request',
      entityId: 'request-1',
    });
    expect(result.status).toBe('closed');
    expect(result.approvals[0].comment).toBe('budget exceeded');
  });
});
