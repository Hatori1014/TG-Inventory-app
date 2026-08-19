import { Injectable, NotFoundException } from '@nestjs/common';
import { PurchasePrismaRepository } from '../../infrastructure/purchase.prisma.repository';
import { SupplierPriceComparisonResponseDto } from '../../dto/supplier-price-comparison-response.dto';
import { buildMonthlyAveragePriceComparison } from '../../domain/price-comparison.util';

// HU-14, view 2 — DoR resolved by the user: up to 3 suppliers, general
// monthly average (not scoped to one product). Suppliers are returned in
// the order the caller requested them, not lookup order, so the frontend
// table/chart's column/series order matches what the user picked.
@Injectable()
export class GetSupplierPriceComparisonUseCase {
  constructor(private readonly purchaseRepository: PurchasePrismaRepository) {}

  async execute(supplierIds: string[]): Promise<SupplierPriceComparisonResponseDto> {
    const found = await this.purchaseRepository.findSuppliersBasicInfo(supplierIds);
    const byId = new Map(found.map((supplier) => [supplier.id, supplier.name]));

    const missing = supplierIds.filter((id) => !byId.has(id));
    if (missing.length > 0) {
      throw new NotFoundException(`Supplier(s) not found: ${missing.join(', ')}`);
    }

    const history = await this.purchaseRepository.findSupplierPriceHistory(supplierIds);
    return {
      suppliers: supplierIds.map((id) => ({ supplierId: id, supplierName: byId.get(id) as string })),
      rows: buildMonthlyAveragePriceComparison(history, supplierIds),
    };
  }
}
