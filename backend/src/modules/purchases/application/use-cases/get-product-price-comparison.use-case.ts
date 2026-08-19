import { Injectable, NotFoundException } from '@nestjs/common';
import { PurchasePrismaRepository } from '../../infrastructure/purchase.prisma.repository';
import { ProductPriceComparisonResponseDto } from '../../dto/product-price-comparison-response.dto';
import { buildProductPriceComparison } from '../../domain/price-comparison.util';

// HU-14, view 1 — "comparar el precio de un mismo producto entre distintos
// proveedores" (plan section 7.4, original HU wording). 404s on a product
// that doesn't exist at all, same distinction HU-05 makes between that and
// a product that exists but no one has ever sold (empty `suppliers`).
@Injectable()
export class GetProductPriceComparisonUseCase {
  constructor(private readonly purchaseRepository: PurchasePrismaRepository) {}

  async execute(productId: string): Promise<ProductPriceComparisonResponseDto> {
    const productName = await this.purchaseRepository.findProductName(productId);
    if (!productName) {
      throw new NotFoundException(`Product ${productId} not found`);
    }

    const history = await this.purchaseRepository.findProductPriceHistory(productId);
    return { productId, productName, suppliers: buildProductPriceComparison(history) };
  }
}
