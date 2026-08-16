import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { InventoryPrismaRepository, InsufficientStockError } from '../../infrastructure/inventory.prisma.repository';
import { CreateMovementDto } from '../../dto/create-movement.dto';
import { TransferResponseDto } from '../../dto/transfer-response.dto';
import { toTransferResponseDto } from '../transfer-response.mapper';
import { isForeignKeyViolation } from '../../../../common/utils/prisma-error.util';

// HU-08 (ADR-28) — "traslado" as one atomic operation: creates
// transfer_out at the source and transfer_in at the destination in a
// single transaction (InventoryPrismaRepository.registerTransfer).
@Injectable()
export class RegisterTransferUseCase {
  constructor(private readonly inventoryRepository: InventoryPrismaRepository) {}

  async execute(dto: CreateMovementDto, userId: string): Promise<TransferResponseDto> {
    if (!dto.destinationLocationId) {
      throw new BadRequestException('destinationLocationId is required for transfers');
    }
    if (dto.destinationLocationId === dto.locationId) {
      throw new BadRequestException('destinationLocationId must be different from locationId');
    }

    const [sourceStatus, destinationStatus] = await Promise.all([
      this.inventoryRepository.findLocationStatus(dto.locationId),
      this.inventoryRepository.findLocationStatus(dto.destinationLocationId),
    ]);
    if (!sourceStatus) {
      throw new BadRequestException('locationId does not exist');
    }
    if (sourceStatus === 'inactive') {
      throw new BadRequestException('locationId refers to an inactive location');
    }
    if (!destinationStatus) {
      throw new BadRequestException('destinationLocationId does not exist');
    }
    if (destinationStatus === 'inactive') {
      throw new BadRequestException('destinationLocationId refers to an inactive location');
    }

    try {
      const { outMovement, inMovement } = await this.inventoryRepository.registerTransfer({
        productId: dto.productId,
        sourceLocationId: dto.locationId,
        destinationLocationId: dto.destinationLocationId,
        batchId: dto.batchId,
        quantity: dto.quantity,
        userId,
        notes: dto.notes,
      });
      return toTransferResponseDto(outMovement, inMovement);
    } catch (error) {
      if (isForeignKeyViolation(error)) {
        throw new BadRequestException('productId does not exist');
      }
      if (error instanceof InsufficientStockError) {
        throw new ConflictException('Insufficient stock at the source location for the requested quantity');
      }
      throw error;
    }
  }
}
