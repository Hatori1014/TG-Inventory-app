import { Injectable } from '@nestjs/common';
import { Prisma, SupplierStatus, LocationStatus, RequestStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { requestWithRelations, RequestWithRelations } from '../application/request-response.mapper';
import { createMovementAndApplyStock, InsufficientStockError, VersionConflictError } from '../../../common/utils/inventory-ledger.util';
import { isUniqueConstraintViolation } from '../../../common/utils/prisma-error.util';
import { decideApprovalOutcome, ApprovalDecision } from '../domain/approval-quorum.util';
import {
  AlreadyVotedError,
  RequestAlreadyResolvedError,
  RequestNotFoundError,
  SelfApprovalError,
} from '../domain/request-approval.errors';

export { InsufficientStockError };

// HU-17, at the user's explicit request ("a hoy pueden ser 2 a futuro 3 o
// 1"): fallback quorum when no ApprovalFlow row exists yet for a
// requestType — no admin UI to manage that table exists in this HU, so a
// real deployment starts on this default until one is configured.
const DEFAULT_REQUIRED_APPROVALS = 2;

export interface CreateRequestItemData {
  productId: string;
  locationId: string;
  quantity: number;
  estimatedPrice?: number;
}

export interface CreateRequestData {
  type: 'purchase' | 'consumption';
  requesterId: string;
  supplierId?: string;
  status: RequestStatus;
  notes?: string;
  items: CreateRequestItemData[];
}

export interface UpdateRequestData {
  supplierId?: string | null;
  notes?: string | null;
  items?: CreateRequestItemData[];
}

// No domain/ layer here for pure persistence — the real business rules
// (what makes a request submittable, HU-16's stock check) live in
// domain/ and the use-cases; this is IO only (ADR-17).
@Injectable()
export class RequestPrismaRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Duplicated trivial reads (ADR-18) — same rationale as every other
  // module that needs a cheap existence/status check on another module's
  // entity without importing its infrastructure/.
  async findSupplierStatus(supplierId: string): Promise<SupplierStatus | null> {
    const supplier = await this.prisma.supplier.findUnique({ where: { id: supplierId }, select: { status: true } });
    return supplier?.status ?? null;
  }

  async findProductName(productId: string): Promise<string | null> {
    const product = await this.prisma.product.findUnique({ where: { id: productId }, select: { name: true } });
    return product?.name ?? null;
  }

  async findLocationStatus(locationId: string): Promise<LocationStatus | null> {
    const location = await this.prisma.location.findUnique({ where: { id: locationId }, select: { status: true } });
    return location?.status ?? null;
  }

  // HU-16 — sums across every batch at this exact (productId, locationId)
  // pair, same "SUM, not a single row" reasoning as HU-12's alerts (a
  // requiresBatch product's stock at one location can be split across
  // several LocationStock rows, one per batch).
  async findAvailableStock(productId: string, locationId: string): Promise<number> {
    const result = await this.prisma.locationStock.aggregate({
      where: { productId, locationId },
      _sum: { quantity: true },
    });
    return Number(result._sum.quantity ?? 0);
  }

  async create(data: CreateRequestData): Promise<RequestWithRelations> {
    return this.prisma.request.create({
      data: {
        type: data.type,
        requesterId: data.requesterId,
        supplierId: data.supplierId,
        status: data.status,
        notes: data.notes,
        items: {
          create: data.items.map((item) => ({
            productId: item.productId,
            locationId: item.locationId,
            quantity: item.quantity,
            estimatedPrice: item.estimatedPrice,
          })),
        },
      },
      include: requestWithRelations.include,
    });
  }

  // Full replace of items on edit — same reasoning as a draft being a
  // work-in-progress form: simpler and safer than diffing individual rows
  // for something that isn't ever concurrently edited by two people.
  async update(id: string, data: UpdateRequestData): Promise<RequestWithRelations> {
    return this.prisma.$transaction(async (tx) => {
      if (data.items) {
        await tx.requestItem.deleteMany({ where: { requestId: id } });
      }
      return tx.request.update({
        where: { id },
        data: {
          supplierId: data.supplierId,
          notes: data.notes,
          ...(data.items && {
            items: {
              create: data.items.map((item) => ({
                productId: item.productId,
                locationId: item.locationId,
                quantity: item.quantity,
                estimatedPrice: item.estimatedPrice,
              })),
            },
          }),
        },
        include: requestWithRelations.include,
      });
    });
  }

  async updateStatus(id: string, status: RequestStatus): Promise<RequestWithRelations> {
    return this.prisma.request.update({
      where: { id },
      data: { status },
      include: requestWithRelations.include,
    });
  }

  async findById(id: string): Promise<RequestWithRelations | null> {
    return this.prisma.request.findUnique({ where: { id }, include: requestWithRelations.include });
  }

  async findAllPaginated(
    skip: number,
    take: number,
    filters: { requesterId?: string; type?: string; status?: string; statusIn?: RequestStatus[] },
  ): Promise<{ items: RequestWithRelations[]; total: number }> {
    const where = {
      ...(filters.requesterId && { requesterId: filters.requesterId }),
      ...(filters.type && { type: filters.type as 'purchase' | 'consumption' }),
      ...(filters.status && { status: filters.status as RequestStatus }),
      ...(filters.statusIn && { status: { in: filters.statusIn } }),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.request.findMany({ where, skip, take, orderBy: { createdAt: 'desc' }, include: requestWithRelations.include }),
      this.prisma.request.count({ where }),
    ]);
    return { items, total };
  }

  // HU-17 — used by GetRequestUseCase to broaden GET /requests/:id beyond
  // ownership, and by the approve/reject/integrate controller actions to
  // gate who may act, without hardcoding a role name (PermissionsGuard's
  // own convention: check the permission, not the role).
  async userHasPermission(userId: string, module: string, action: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { roleId: true } });
    if (!user) {
      return false;
    }
    const count = await this.prisma.rolePermission.count({
      where: { roleId: user.roleId, permission: { module, action } },
    });
    return count > 0;
  }

  // ADR-08's table, first real consumer (HU-17) — level 1 only, no
  // multi-level sequence yet (HU-18, post-MVP).
  private async findRequiredApprovals(tx: Prisma.TransactionClient, requestType: 'purchase' | 'consumption'): Promise<number> {
    const flow = await tx.approvalFlow.findFirst({ where: { requestType, level: 1 } });
    return flow?.requiredApprovals ?? DEFAULT_REQUIRED_APPROVALS;
  }

  // FIFO across every batch of this product at this location — RequestItem
  // never captures a specific batch (the requester doesn't know lot
  // numbers at request time, same reasoning as findAvailableStock summing
  // across all of them); oldest received first is the standard inventory
  // default absent any other stated preference. A non-batch-tracked
  // product is a single movement, same as HU-07/08's plain "out".
  private async applyConsumptionMovement(
    tx: Prisma.TransactionClient,
    item: { productId: string; locationId: string; quantity: number },
    approverId: string,
    requestId: string,
  ): Promise<void> {
    const product = await tx.product.findUniqueOrThrow({
      where: { id: item.productId },
      select: { requiresBatch: true },
    });

    if (!product.requiresBatch) {
      await createMovementAndApplyStock(tx, {
        productId: item.productId,
        locationId: item.locationId,
        type: 'out',
        quantity: item.quantity,
        delta: -item.quantity,
        userId: approverId,
        requestId,
      });
      return;
    }

    const batchStocks = await tx.locationStock.findMany({
      where: { productId: item.productId, locationId: item.locationId, batchId: { not: null }, quantity: { gt: 0 } },
      orderBy: { batch: { receivedAt: 'asc' } },
    });

    let remaining = item.quantity;
    for (const stock of batchStocks) {
      if (remaining <= 0) {
        break;
      }
      const take = Math.min(remaining, Number(stock.quantity));
      await createMovementAndApplyStock(tx, {
        productId: item.productId,
        locationId: item.locationId,
        batchId: stock.batchId ?? undefined,
        type: 'out',
        quantity: take,
        delta: -take,
        userId: approverId,
        requestId,
      });
      remaining -= take;
    }
    if (remaining > 0) {
      throw new InsufficientStockError();
    }
  }

  // The whole point of HU-17: recording one approver's vote and, in the
  // SAME transaction, deciding whether the request's status moves —
  // atomic so a version conflict (two approvers racing to cast the vote
  // that reaches quorum) rolls back the vote too, and withOptimisticLock
  // (called by the use-case) retries the whole thing, including the
  // recount, against fresh data. Consumption's real "out" movement is
  // executed here too, in the same transaction, the moment quorum is
  // reached — never as a separate step.
  async recordApprovalDecision(input: {
    requestId: string;
    approverId: string;
    decision: ApprovalDecision;
    comment?: string;
  }): Promise<RequestWithRelations | null> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const request = await tx.request.findUnique({
          where: { id: input.requestId },
          include: { approvals: true, items: true },
        });
        if (!request) {
          throw new RequestNotFoundError();
        }
        if (request.requesterId === input.approverId) {
          throw new SelfApprovalError();
        }
        if (request.status !== 'pending' && request.status !== 'in_review') {
          throw new RequestAlreadyResolvedError();
        }

        try {
          await tx.requestApproval.create({
            data: {
              requestId: input.requestId,
              approverId: input.approverId,
              decision: input.decision,
              comment: input.comment,
            },
          });
        } catch (error) {
          if (isUniqueConstraintViolation(error)) {
            throw new AlreadyVotedError();
          }
          throw error;
        }

        const decisions: ApprovalDecision[] = [...request.approvals.map((a) => a.decision), input.decision];
        const requiredApprovals = await this.findRequiredApprovals(tx, request.type);
        const outcome = decideApprovalOutcome({ decisions, requiredApprovals });

        let nextStatus: RequestStatus = request.status;
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
              await this.applyConsumptionMovement(
                tx,
                { productId: item.productId, locationId: item.locationId, quantity: Number(item.quantity) },
                input.approverId,
                request.id,
              );
            }
            nextStatus = 'closed';
          }
        }

        const updateResult = await tx.request.updateMany({
          where: { id: input.requestId, version: request.version },
          data: { status: nextStatus, resolvedAt, version: { increment: 1 } },
        });
        if (updateResult.count === 0) {
          throw new VersionConflictError();
        }

        return tx.request.findUniqueOrThrow({ where: { id: input.requestId }, include: requestWithRelations.include });
      });
    } catch (error) {
      if (error instanceof VersionConflictError) {
        return null;
      }
      throw error;
    }
  }

  // HU-17 — the last step of "Integrar al inventario": links the newly
  // created Purchase (registered via RegisterPurchaseUseCase, reused from
  // HU-13) back to the request and closes it. Not wrapped in the same
  // transaction as the purchase's own creation (RegisterPurchaseUseCase
  // owns its own $transaction internally, and cross-module reuse per the
  // user's explicit instruction means not reaching into it) — accepted gap
  // for the narrow crash window between the two calls, same category as
  // HU-06's parentId race gap.
  async closeAfterIntegration(requestId: string, purchaseId: string): Promise<RequestWithRelations> {
    return this.prisma.request.update({
      where: { id: requestId },
      data: { status: 'closed', purchaseId },
      include: requestWithRelations.include,
    });
  }
}
