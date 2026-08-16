import { InventoryMovement } from '@prisma/client';
import { TransferResponseDto } from '../dto/transfer-response.dto';
import { toMovementResponseDto } from './movement-response.mapper';

export function toTransferResponseDto(
  outMovement: InventoryMovement,
  inMovement: InventoryMovement,
): TransferResponseDto {
  return {
    out: toMovementResponseDto(outMovement),
    in: toMovementResponseDto(inMovement),
  };
}
