import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { MinimumStockPrismaRepository } from '../../infrastructure/minimum-stock.prisma.repository';
import { CreateMinimumStockDto } from '../../dto/create-minimum-stock.dto';
import { MinimumStockResponseDto } from '../../dto/minimum-stock-response.dto';
import { toMinimumStockResponseDto } from '../minimum-stock-response.mapper';

// HU-11 — "Definir stock mínimo" (plan section 7.4: POST
// /inventory/minimum-stock). One minimum per product (DoR resolved by the
// user): a second POST for a product that already has one is rejected —
// PATCH is how you change an existing threshold, matching the REST split
// the plan itself defines (POST create / PATCH edit).
@Injectable()
export class CreateMinimumStockUseCase {
  constructor(private readonly minimumStockRepository: MinimumStockPrismaRepository) {}

  async execute(dto: CreateMinimumStockDto): Promise<MinimumStockResponseDto> {
    const productName = await this.minimumStockRepository.findProductName(dto.productId);
    if (!productName) {
      throw new BadRequestException('productId does not exist');
    }

    const existing = await this.minimumStockRepository.findByProductId(dto.productId);
    if (existing) {
      throw new ConflictException('This product already has a minimum stock defined — use PATCH to edit it');
    }

    const minimumStock = await this.minimumStockRepository.create({
      productId: dto.productId,
      minimumQuantity: dto.minimumQuantity,
    });
    return toMinimumStockResponseDto(minimumStock);
  }
}
