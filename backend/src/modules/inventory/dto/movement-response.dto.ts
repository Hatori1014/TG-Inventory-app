export interface MovementResponseDto {
  id: string;
  productId: string;
  locationId: string;
  batchId: string | null;
  type: string;
  quantity: number;
  userId: string;
  occurredAt: Date;
  notes: string | null;
}
