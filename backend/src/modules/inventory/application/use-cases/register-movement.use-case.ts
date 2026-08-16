import { BadRequestException, Injectable } from '@nestjs/common';
import { InventoryPrismaRepository } from '../../infrastructure/inventory.prisma.repository';
import { CreateMovementDto } from '../../dto/create-movement.dto';
import { MovementResponseDto } from '../../dto/movement-response.dto';
import { toMovementResponseDto } from '../movement-response.mapper';
import { MovementRequest } from '../../domain/movement-request.entity';
import { isForeignKeyViolation } from '../../../../common/utils/prisma-error.util';

@Injectable()
export class RegisterMovementUseCase {
  constructor(private readonly inventoryRepository: InventoryPrismaRepository) {}

  async execute(dto: CreateMovementDto, userId: string): Promise<MovementResponseDto> {
    const movementRequest = new MovementRequest(dto.type, dto.quantity);
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
        type: dto.type,
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
      throw error;
    }
  }
}
