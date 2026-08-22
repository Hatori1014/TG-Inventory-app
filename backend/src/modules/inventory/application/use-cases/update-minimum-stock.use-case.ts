import { Injectable, NotFoundException } from '@nestjs/common';
import { MinimumStockPrismaRepository } from '../../infrastructure/minimum-stock.prisma.repository';
import { UpdateMinimumStockDto } from '../../dto/update-minimum-stock.dto';
import { MinimumStockResponseDto } from '../../dto/minimum-stock-response.dto';
import { toMinimumStockResponseDto } from '../minimum-stock-response.mapper';

// HU-11 — PATCH /inventory/minimum-stock/:id. productId is fixed at
// creation (ADR-22: "removing" a threshold is an update to 0, never a
// DELETE — there's no scenario here for reassigning it to another product
// either, same as every other resource's identity in this codebase).
@Injectable()
export class UpdateMinimumStockUseCase {
  constructor(private readonly minimumStockRepository: MinimumStockPrismaRepository) {}

  async execute(id: string, dto: UpdateMinimumStockDto): Promise<MinimumStockResponseDto> {
    const existing = await this.minimumStockRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Minimum stock ${id} not found`);
    }

    const updated = await this.minimumStockRepository.update(id, dto.minimumQuantity);
    return toMinimumStockResponseDto(updated);
  }
}
