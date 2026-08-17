import { InventoryMovement } from '@prisma/client';
import { MovementResponseDto } from '../dto/movement-response.dto';

export function toMovementResponseDto(movement: InventoryMovement): MovementResponseDto {
  return {
    id: movement.id,
    productId: movement.productId,
    locationId: movement.locationId,
    batchId: movement.batchId,
    type: movement.type,
    quantity: Number(movement.quantity),
    userId: movement.userId,
    occurredAt: movement.occurredAt,
    notes: movement.notes,
  };
}
