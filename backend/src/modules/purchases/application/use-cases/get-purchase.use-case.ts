import { Injectable, NotFoundException } from '@nestjs/common';
import { PurchasePrismaRepository } from '../../infrastructure/purchase.prisma.repository';
import { PurchaseResponseDto } from '../../dto/purchase-response.dto';
import { toPurchaseResponseDto } from '../purchase-response.mapper';

@Injectable()
export class GetPurchaseUseCase {
  constructor(private readonly purchaseRepository: PurchasePrismaRepository) {}

  async execute(id: string): Promise<PurchaseResponseDto> {
    const purchase = await this.purchaseRepository.findById(id);
    if (!purchase) {
      throw new NotFoundException(`Purchase ${id} not found`);
    }
    return toPurchaseResponseDto(purchase);
  }
}
