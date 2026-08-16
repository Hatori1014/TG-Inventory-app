export interface BatchResponseDto {
  id: string;
  productId: string;
  batchNumber: string;
  expiresAt: string | null;
  receivedAt: string;
}
