// Mirrors the backend DTOs (plan section 7.4, HU-09).
export interface Batch {
  id: string;
  productId: string;
  batchNumber: string;
  expiresAt: string | null;
  receivedAt: string;
}

export interface CreateBatchRequest {
  productId: string;
  batchNumber: string;
  expiresAt?: string;
  receivedAt?: string;
}
