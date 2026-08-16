import { Batch } from '@prisma/client';
import { BatchResponseDto } from '../dto/batch-response.dto';

export function toBatchResponseDto(batch: Batch): BatchResponseDto {
  return {
    id: batch.id,
    productId: batch.productId,
    batchNumber: batch.batchNumber,
    expiresAt: batch.expiresAt ? batch.expiresAt.toISOString() : null,
    receivedAt: batch.receivedAt.toISOString(),
  };
}
