// Mirrors the backend DTOs (plan section 7.4, HU-15) — keep in sync by
// hand until it's worth sharing a types package between backend/ and
// frontend/. Only 'purchase' is buildable from the frontend yet — HU-16
// adds 'consumption'.
export interface RequestItem {
  id: string;
  productId: string;
  productName: string;
  locationId: string;
  locationName: string;
  quantity: number;
  estimatedPrice: number | null;
}

export interface PurchaseRequest {
  id: string;
  type: 'purchase' | 'consumption';
  status: string;
  requesterId: string;
  requesterName: string;
  supplierId: string | null;
  supplierName: string | null;
  createdAt: string;
  resolvedAt: string | null;
  notes: string | null;
  items: RequestItem[];
}

export interface CreateRequestItemRequest {
  productId: string;
  locationId: string;
  quantity: number;
  estimatedPrice?: number;
}

export interface CreateRequestRequest {
  type: 'purchase';
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
