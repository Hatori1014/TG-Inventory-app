export interface RequestItemResponseDto {
  id: string;
  productId: string;
  productName: string;
  locationId: string;
  locationName: string;
  quantity: number;
  estimatedPrice: number | null;
}

export interface RequestApprovalResponseDto {
  id: string;
  approverId: string;
  approverName: string;
  decision: 'approved' | 'rejected';
  comment: string | null;
  decidedAt: string;
}

export interface RequestResponseDto {
  id: string;
  type: 'purchase' | 'consumption';
  status: string;
  requesterId: string;
  requesterName: string;
  supplierId: string | null;
  supplierName: string | null;
  // HU-17 — set once the request is integrated into a real Purchase
  // (purchase type only, status = closed via IntegrateRequestUseCase).
  purchaseId: string | null;
  createdAt: string;
  resolvedAt: string | null;
  notes: string | null;
  items: RequestItemResponseDto[];
  // HU-17 — the full approval trail: who voted, how, and (mandatory on a
  // rejection) why — this is how "el usuario solicitante se entera del
  // rechazo" is satisfied, no separate notification system.
  approvals: RequestApprovalResponseDto[];
}
