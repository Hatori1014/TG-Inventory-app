import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { InventoryPrismaRepository, InsufficientStockError } from '../../infrastructure/inventory.prisma.repository';
import { CreateMovementDto } from '../../dto/create-movement.dto';
import { MovementResponseDto } from '../../dto/movement-response.dto';
import { toMovementResponseDto } from '../movement-response.mapper';
import { MovementRequest } from '../../domain/movement-request.entity';
import { isForeignKeyViolation } from '../../../../common/utils/prisma-error.util';

// Handles "in"/"out"/"adjustment" — single location, single movement.
// "transfer" is routed to RegisterTransferUseCase by the controller
// (ADR-28): dto.type is narrowed here because the controller never calls
// this use-case with type === 'transfer'.
@Injectable()
export class RegisterMovementUseCase {
  constructor(private readonly inventoryRepository: InventoryPrismaRepository) {}

  async execute(dto: CreateMovementDto, userId: string): Promise<MovementResponseDto> {
    const type = dto.type as 'in' | 'out' | 'adjustment';
    const movementRequest = new MovementRequest(type, dto.quantity, dto.direction);
    const delta = movementRequest.computeStockDelta();

    const locationStatus = await this.inventoryRepository.findLocationStatus(dto.locationId);
    if (!locationStatus) {
      throw new BadRequestException('locationId does not exist');
    }
    if (locationStatus === 'inactive') {
      throw new BadRequestException('locationId refers to an inactive location');
    }

    try {
      const { movement } = await this.inventoryRepository.registerMovement({
        productId: dto.productId,
        locationId: dto.locationId,
        batchId: dto.batchId,
        type,
        quantity: dto.quantity,
        delta,
        userId,
        notes: dto.notes,
      });
      return toMovementResponseDto(movement);
    } catch (error) {
      if (isForeignKeyViolation(error)) {
        throw new BadRequestException('productId does not exist');
      }
      if (error instanceof InsufficientStockError) {
        throw new ConflictException('Insufficient stock at this location for the requested quantity');
      }
      throw error;
    }
  }
}
