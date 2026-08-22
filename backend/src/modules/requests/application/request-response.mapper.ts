import { Prisma } from '@prisma/client';
import { RequestResponseDto } from '../dto/request-response.dto';

export const requestWithRelations = Prisma.validator<Prisma.RequestDefaultArgs>()({
  include: {
    requester: { select: { id: true, name: true } },
    supplier: { select: { id: true, name: true } },
    items: {
      include: {
        product: { select: { id: true, name: true } },
        location: { select: { id: true, name: true } },
      },
    },
    approvals: {
      include: { approver: { select: { id: true, name: true } } },
      orderBy: { decidedAt: 'asc' },
    },
  },
});
export type RequestWithRelations = Prisma.RequestGetPayload<typeof requestWithRelations>;

export function toRequestResponseDto(request: RequestWithRelations): RequestResponseDto {
  return {
    id: request.id,
    type: request.type,
    status: request.status,
    requesterId: request.requesterId,
    requesterName: request.requester.name,
    supplierId: request.supplierId,
    supplierName: request.supplier?.name ?? null,
    purchaseId: request.purchaseId,
    createdAt: request.createdAt.toISOString(),
    resolvedAt: request.resolvedAt?.toISOString() ?? null,
    notes: request.notes,
    items: request.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.product.name,
      locationId: item.locationId,
      locationName: item.location.name,
      quantity: Number(item.quantity),
      estimatedPrice: item.estimatedPrice !== null ? Number(item.estimatedPrice) : null,
    })),
    approvals: request.approvals.map((approval) => ({
      id: approval.id,
      approverId: approval.approverId,
      approverName: approval.approver.name,
      decision: approval.decision,
      comment: approval.comment,
      decidedAt: approval.decidedAt.toISOString(),
    })),
  };
}
