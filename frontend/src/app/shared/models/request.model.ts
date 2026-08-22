// Mirrors the backend DTOs (plan section 7.4, HU-15/16) — keep in sync by
// hand until it's worth sharing a types package between backend/ and
// frontend/.
export interface RequestItem {
  id: string;
  productId: string;
  productName: string;
  locationId: string;
  locationName: string;
  quantity: number;
  estimatedPrice: number | null;
}

export interface RequestApproval {
  id: string;
  approverId: string;
  approverName: string;
  decision: 'approved' | 'rejected';
  comment: string | null;
  decidedAt: string;
}

export interface PurchaseRequest {
  id: string;
  type: 'purchase' | 'consumption';
  status: string;
  requesterId: string;
  requesterName: string;
  supplierId: string | null;
  supplierName: string | null;
  // HU-17 — set once the request is integrated into a real Purchase.
  purchaseId: string | null;
  createdAt: string;
  resolvedAt: string | null;
  notes: string | null;
  items: RequestItem[];
  approvals: RequestApproval[];
}

export interface CreateRequestItemRequest {
  productId: string;
  locationId: string;
  quantity: number;
  estimatedPrice?: number;
}

export interface CreateRequestRequest {
  type: 'purchase' | 'consumption';
  supplierId?: string;
  items?: CreateRequestItemRequest[];
  notes?: string;
  saveAsDraft?: boolean;
}

export interface UpdateRequestRequest {
  supplierId?: string;
  items?: CreateRequestItemRequest[];
  notes?: string;
}

export interface IntegrateRequestItemRequest {
  requestItemId: string;
  unitPrice: number;
  batchNumber?: string;
  batchExpiresAt?: string;
}
