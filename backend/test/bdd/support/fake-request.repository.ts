import { randomUUID } from 'crypto';
import { LocationStatus, SupplierStatus } from '@prisma/client';
import { RequestWithRelations } from '../../../src/modules/requests/application/request-response.mapper';
import { CreateRequestData, UpdateRequestData } from '../../../src/modules/requests/infrastructure/request.prisma.repository';
import { decideApprovalOutcome, ApprovalDecision } from '../../../src/modules/requests/domain/approval-quorum.util';
import {
  AlreadyVotedError,
  RequestAlreadyResolvedError,
  RequestNotFoundError,
  SelfApprovalError,
} from '../../../src/modules/requests/domain/request-approval.errors';
import { InsufficientStockError } from '../../../src/common/utils/inventory-ledger.util';

// In-memory stand-in for RequestPrismaRepository — never touches Postgres
// (CI has no database service). Same independent-per-endpoint reasoning as
// every other Fake in this suite.
export class FakeRequestRepository {
  private readonly suppliers = new Map<string, { name: string; status: SupplierStatus }>();
  private readonly products = new Map<string, string>();
  private readonly locations = new Map<string, { name: string; status: LocationStatus }>();
  private readonly requests = new Map<string, RequestWithRelations>();
  private readonly stock = new Map<string, number>();
  private readonly requiredApprovals = new Map<string, number>();
  private readonly userPermissions = new Map<string, Set<string>>();

  seedSupplier(id: string, name: string, status: SupplierStatus = 'active'): void {
    this.suppliers.set(id, { name, status });
  }

  // HU-16 — a test-only helper to set how much of a product is available
  // at a location, without going through the real movement machinery
  // (same reasoning as every other seedStock()-style helper in this
  // suite).
  seedStock(productId: string, locationId: string, quantity: number): void {
    this.stock.set(`${productId}|${locationId}`, quantity);
  }

  seedProduct(id: string, name: string): void {
    this.products.set(id, name);
  }

  seedLocation(id: string, name: string, status: LocationStatus = 'active'): void {
    this.locations.set(id, { name, status });
  }

  // HU-17 — ApprovalFlow.requiredApprovals stand-in; defaults to 2, same
  // fallback as RequestPrismaRepository when nothing is configured.
  seedRequiredApprovals(type: 'purchase' | 'consumption', count: number): void {
    this.requiredApprovals.set(type, count);
  }

  seedUserPermission(userId: string, module: string, action: string): void {
    if (!this.userPermissions.has(userId)) {
      this.userPermissions.set(userId, new Set());
    }
    this.userPermissions.get(userId)!.add(`${module}:${action}`);
  }

  async findSupplierStatus(supplierId: string): Promise<SupplierStatus | null> {
    return this.suppliers.get(supplierId)?.status ?? null;
  }

  async findProductName(productId: string): Promise<string | null> {
    return this.products.get(productId) ?? null;
  }

  async findLocationStatus(locationId: string): Promise<LocationStatus | null> {
    return this.locations.get(locationId)?.status ?? null;
  }

  async findAvailableStock(productId: string, locationId: string): Promise<number> {
    return this.stock.get(`${productId}|${locationId}`) ?? 0;
  }

  async create(data: CreateRequestData): Promise<RequestWithRelations> {
    const supplier = data.supplierId ? this.suppliers.get(data.supplierId) : undefined;
    const request = {
      id: randomUUID(),
      type: data.type,
      requesterId: data.requesterId,
      requester: { id: data.requesterId, name: 'Requester' },
      supplierId: data.supplierId ?? null,
      supplier: data.supplierId ? { id: data.supplierId, name: supplier?.name ?? data.supplierId } : null,
      purchaseId: null,
      status: data.status,
      createdAt: new Date(),
      resolvedAt: null,
      notes: data.notes ?? null,
      approvals: [],
      items: data.items.map((item) => ({
        id: randomUUID(),
        productId: item.productId,
        product: { id: item.productId, name: this.products.get(item.productId) ?? item.productId },
        locationId: item.locationId,
        location: { id: item.locationId, name: this.locations.get(item.locationId)?.name ?? item.locationId },
        quantity: item.quantity,
        estimatedPrice: item.estimatedPrice ?? null,
      })),
    } as unknown as RequestWithRelations;
    this.requests.set(request.id, request);
    return request;
  }

  async update(id: string, data: UpdateRequestData): Promise<RequestWithRelations> {
    const existing = this.requests.get(id) as RequestWithRelations;
    const supplier = data.supplierId ? this.suppliers.get(data.supplierId) : undefined;
    const updated = {
      ...existing,
      supplierId: data.supplierId !== undefined ? data.supplierId : existing.supplierId,
      supplier:
        data.supplierId !== undefined
          ? data.supplierId
            ? { id: data.supplierId, name: supplier?.name ?? data.supplierId }
            : null
          : existing.supplier,
      notes: data.notes !== undefined ? data.notes : existing.notes,
      items: data.items
        ? data.items.map((item) => ({
            id: randomUUID(),
            productId: item.productId,
            product: { id: item.productId, name: this.products.get(item.productId) ?? item.productId },
            locationId: item.locationId,
            location: { id: item.locationId, name: this.locations.get(item.locationId)?.name ?? item.locationId },
            quantity: item.quantity,
            estimatedPrice: item.estimatedPrice ?? null,
          }))
        : existing.items,
    } as unknown as RequestWithRelations;
    this.requests.set(id, updated);
    return updated;
  }

  async updateStatus(id: string, status: string): Promise<RequestWithRelations> {
    const existing = this.requests.get(id) as RequestWithRelations;
    const updated = { ...existing, status } as unknown as RequestWithRelations;
    this.requests.set(id, updated);
    return updated;
  }

  async findById(id: string): Promise<RequestWithRelations | null> {
    return this.requests.get(id) ?? null;
  }

  async findAllPaginated(
    skip: number,
    take: number,
    filters: { requesterId?: string; type?: string; status?: string; statusIn?: string[] },
  ): Promise<{ items: RequestWithRelations[]; total: number }> {
    let all = [...this.requests.values()];
    if (filters.requesterId) all = all.filter((r) => r.requesterId === filters.requesterId);
    if (filters.type) all = all.filter((r) => r.type === filters.type);
    if (filters.status) all = all.filter((r) => r.status === filters.status);
    if (filters.statusIn) all = all.filter((r) => filters.statusIn!.includes(r.status));
    all = all.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return { items: all.slice(skip, skip + take), total: all.length };
  }

  async userHasPermission(userId: string, module: string, action: string): Promise<boolean> {
    return this.userPermissions.get(userId)?.has(`${module}:${action}`) ?? false;
  }

  // HU-17 — same read-decide-write shape as the real repository's
  // transactional method, minus the version-conflict retry (nothing in
  // this in-memory store races concurrently within a single test).
  async recordApprovalDecision(input: {
    requestId: string;
    approverId: string;
    decision: ApprovalDecision;
    comment?: string;
  }): Promise<RequestWithRelations | null> {
    const request = this.requests.get(input.requestId) as (RequestWithRelations & { approvals: any[] }) | undefined;
    if (!request) {
      throw new RequestNotFoundError();
    }
    if (request.requesterId === input.approverId) {
      throw new SelfApprovalError();
    }
    if (request.status !== 'pending' && request.status !== 'in_review') {
      throw new RequestAlreadyResolvedError();
    }
    if (request.approvals.some((approval) => approval.approverId === input.approverId)) {
      throw new AlreadyVotedError();
    }

    const newApproval = {
      id: randomUUID(),
      approverId: input.approverId,
      approver: { id: input.approverId, name: 'Approver' },
      decision: input.decision,
      comment: input.comment ?? null,
      decidedAt: new Date(),
    };
    const decisions: ApprovalDecision[] = [...request.approvals.map((a) => a.decision), input.decision];
    const requiredApprovals = this.requiredApprovals.get(request.type) ?? 2;
    const outcome = decideApprovalOutcome({ decisions, requiredApprovals });

    let nextStatus: string = request.status;
    let resolvedAt = request.resolvedAt;
    if (outcome === 'awaiting_more') {
      nextStatus = 'in_review';
    } else if (outcome === 'rejected') {
      nextStatus = 'closed';
      resolvedAt = new Date();
    } else {
      resolvedAt = new Date();
      if (request.type === 'purchase') {
        nextStatus = 'pending_inventory_integration';
      } else {
        for (const item of request.items) {
          const key = `${item.productId}|${item.locationId}`;
          const available = this.stock.get(key) ?? 0;
          if (Number(item.quantity) > available) {
            throw new InsufficientStockError();
          }
          this.stock.set(key, available - Number(item.quantity));
        }
        nextStatus = 'closed';
      }
    }

    const updated = {
      ...request,
      status: nextStatus,
      resolvedAt,
      approvals: [...request.approvals, newApproval],
    } as unknown as RequestWithRelations;
    this.requests.set(input.requestId, updated);
    return updated;
  }

  async closeAfterIntegration(requestId: string, purchaseId: string): Promise<RequestWithRelations> {
    const existing = this.requests.get(requestId) as RequestWithRelations;
    const updated = { ...existing, status: 'closed', purchaseId } as unknown as RequestWithRelations;
    this.requests.set(requestId, updated);
    return updated;
  }
}
