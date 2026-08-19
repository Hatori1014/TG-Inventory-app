// Mirrors the backend DTO (plan section 7.4, HU-13) — keep in sync by hand
// until it's worth sharing a types package between backend/ and frontend/.
export interface PurchaseItem {
  id: string;
  productId: string;
  productName: string;
  locationId: string;
  locationName: string;
  batchId: string | null;
  batchNumber: string | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface Purchase {
  id: string;
  supplierId: string;
  supplierName: string;
  userId: string;
  purchasedAt: string;
  status: 'registered' | 'received';
  items: PurchaseItem[];
  totalAmount: number;
}

export interface CreatePurchaseItemRequest {
  productId: string;
  locationId: string;
  batchNumber?: string;
  batchExpiresAt?: string;
  quantity: number;
  unitPrice: number;
}

export interface CreatePurchaseRequest {
  supplierId: string;
  items: CreatePurchaseItemRequest[];
}
