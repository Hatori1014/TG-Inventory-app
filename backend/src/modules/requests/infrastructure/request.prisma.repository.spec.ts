import { RequestPrismaRepository } from './request.prisma.repository';
import {
  AlreadyVotedError,
  RequestAlreadyResolvedError,
  RequestNotFoundError,
  SelfApprovalError,
} from '../domain/request-approval.errors';

// HU-17, TDD-first per convenciones.md ("si el error cuesta caro...
// obligatorio"): recordApprovalDecision is the one place quorum, rejection,
// and the real consumption movement all happen atomically — getting it
// wrong means a request stalls forever, resolves with too few approvals,
// or double-executes a movement. Mocked $transaction, same pattern as
// InventoryPrismaRepository's own spec — no real DB needed to verify the
// transaction's internal decisions.
describe('RequestPrismaRepository.recordApprovalDecision', () => {
  let prisma: any;
  let repository: RequestPrismaRepository;

  const baseRequest = {
    id: 'request-1',
    type: 'purchase',
    requesterId: 'requester-1',
    status: 'pending',
    version: 0,
    resolvedAt: null,
    approvals: [],
    items: [],
  };

  function buildTx(overrides: Record<string, unknown> = {}) {
    return {
      request: {
        findUnique: jest.fn().mockResolvedValue(baseRequest),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'request-1' }),
      },
      requestApproval: {
        create: jest.fn().mockResolvedValue({ id: 'approval-1' }),
      },
      approvalFlow: {
        findFirst: jest.fn().mockResolvedValue({ requiredApprovals: 2 }),
      },
      product: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({ requiresBatch: false }),
      },
      locationStock: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'stock-1' }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'stock-1' }),
      },
      inventoryMovement: {
        create: jest.fn().mockResolvedValue({ id: 'movement-1' }),
      },
      ...overrides,
    };
  }

  beforeEach(() => {
    prisma = { $transaction: jest.fn() };
    repository = new RequestPrismaRepository(prisma);
  });

  it('throws RequestNotFoundError when the request does not exist', async () => {
    const tx = buildTx({ request: { findUnique: jest.fn().mockResolvedValue(null) } });
    prisma.$transaction.mockImplementation((cb: any) => cb(tx));

    await expect(
      repository.recordApprovalDecision({ requestId: 'missing', approverId: 'approver-1', decision: 'approved' }),
    ).rejects.toBeInstanceOf(RequestNotFoundError);
  });

  it('throws SelfApprovalError when the approver is the requester', async () => {
    const tx = buildTx();
    prisma.$transaction.mockImplementation((cb: any) => cb(tx));

    await expect(
      repository.recordApprovalDecision({ requestId: 'request-1', approverId: 'requester-1', decision: 'approved' }),
    ).rejects.toBeInstanceOf(SelfApprovalError);
  });

  it('throws RequestAlreadyResolvedError when the request is not pending/in_review', async () => {
    const tx = buildTx({
      request: {
        findUnique: jest.fn().mockResolvedValue({ ...baseRequest, status: 'closed' }),
        updateMany: jest.fn(),
        findUniqueOrThrow: jest.fn(),
      },
    });
    prisma.$transaction.mockImplementation((cb: any) => cb(tx));

    await expect(
      repository.recordApprovalDecision({ requestId: 'request-1', approverId: 'approver-1', decision: 'approved' }),
    ).rejects.toBeInstanceOf(RequestAlreadyResolvedError);
  });

  it('throws AlreadyVotedError when the same approver votes twice (unique constraint)', async () => {
    const tx = buildTx({
      requestApproval: { create: jest.fn().mockRejectedValue({ code: 'P2002' }) },
    });
    prisma.$transaction.mockImplementation((cb: any) => cb(tx));

    await expect(
      repository.recordApprovalDecision({ requestId: 'request-1', approverId: 'approver-1', decision: 'approved' }),
    ).rejects.toBeInstanceOf(AlreadyVotedError);
  });

  it('moves to in_review when quorum is not yet reached', async () => {
    const tx = buildTx();
    prisma.$transaction.mockImplementation((cb: any) => cb(tx));

    await repository.recordApprovalDecision({ requestId: 'request-1', approverId: 'approver-1', decision: 'approved' });

    expect(tx.request.updateMany).toHaveBeenCalledWith({
      where: { id: 'request-1', version: 0 },
      data: { status: 'in_review', resolvedAt: null, version: { increment: 1 } },
    });
  });

  it('moves a purchase request straight to pending_inventory_integration when quorum is reached', async () => {
    const tx = buildTx({
      request: {
        findUnique: jest.fn().mockResolvedValue({
          ...baseRequest,
          status: 'in_review',
          approvals: [{ decision: 'approved' }],
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'request-1' }),
      },
    });
    prisma.$transaction.mockImplementation((cb: any) => cb(tx));

    await repository.recordApprovalDecision({ requestId: 'request-1', approverId: 'approver-2', decision: 'approved' });

    expect(tx.request.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'pending_inventory_integration' }) }),
    );
    expect(tx.inventoryMovement.create).not.toHaveBeenCalled();
  });

  it('executes the real "out" movement and closes a consumption request when quorum is reached', async () => {
    const tx = buildTx({
      request: {
        findUnique: jest.fn().mockResolvedValue({
          ...baseRequest,
          type: 'consumption',
          status: 'in_review',
          approvals: [{ decision: 'approved' }],
          items: [{ productId: 'product-1', locationId: 'location-1', quantity: 5 }],
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'request-1' }),
      },
      locationStock: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue({ id: 'stock-1', quantity: 5, version: 0, batchId: null }),
        create: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'stock-1' }),
      },
    });
    prisma.$transaction.mockImplementation((cb: any) => cb(tx));

    await repository.recordApprovalDecision({ requestId: 'request-1', approverId: 'approver-2', decision: 'approved' });

    expect(tx.inventoryMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: 'out', quantity: 5, requestId: 'request-1', userId: 'approver-2' }),
      }),
    );
    expect(tx.request.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'closed' }) }),
    );
  });

  it('draws from batches oldest-first (FIFO) for a batch-tracked consumption item', async () => {
    const tx = buildTx({
      request: {
        findUnique: jest.fn().mockResolvedValue({
          ...baseRequest,
          type: 'consumption',
          status: 'in_review',
          approvals: [{ decision: 'approved' }],
          items: [{ productId: 'product-1', locationId: 'location-1', quantity: 8 }],
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'request-1' }),
      },
      product: { findUniqueOrThrow: jest.fn().mockResolvedValue({ requiresBatch: true }) },
      locationStock: {
        findMany: jest.fn().mockResolvedValue([
          { batchId: 'batch-old', quantity: 5 },
          { batchId: 'batch-new', quantity: 10 },
        ]),
        findFirst: jest.fn().mockResolvedValue({ id: 'stock-x', quantity: 5, version: 0, batchId: null }),
        create: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'stock-x' }),
      },
    });
    prisma.$transaction.mockImplementation((cb: any) => cb(tx));

    await repository.recordApprovalDecision({ requestId: 'request-1', approverId: 'approver-2', decision: 'approved' });

    expect(tx.inventoryMovement.create).toHaveBeenCalledTimes(2);
    expect(tx.inventoryMovement.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ data: expect.objectContaining({ batchId: 'batch-old', quantity: 5 }) }),
    );
    expect(tx.inventoryMovement.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ data: expect.objectContaining({ batchId: 'batch-new', quantity: 3 }) }),
    );
  });

  it('closes the request immediately on rejection, regardless of quorum', async () => {
    const tx = buildTx();
    prisma.$transaction.mockImplementation((cb: any) => cb(tx));

    await repository.recordApprovalDecision({
      requestId: 'request-1',
      approverId: 'approver-1',
      decision: 'rejected',
      comment: 'budget exceeded',
    });

    expect(tx.requestApproval.create).toHaveBeenCalledWith({
      data: { requestId: 'request-1', approverId: 'approver-1', decision: 'rejected', comment: 'budget exceeded' },
    });
    expect(tx.request.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'closed' }) }),
    );
  });

  it('returns null on a version conflict so the use-case retries', async () => {
    const tx = buildTx({ request: { findUnique: jest.fn().mockResolvedValue(baseRequest), updateMany: jest.fn().mockResolvedValue({ count: 0 }), findUniqueOrThrow: jest.fn() } });
    prisma.$transaction.mockImplementation((cb: any) => cb(tx));

    const result = await repository.recordApprovalDecision({
      requestId: 'request-1',
      approverId: 'approver-1',
      decision: 'approved',
    });

    expect(result).toBeNull();
  });
});
