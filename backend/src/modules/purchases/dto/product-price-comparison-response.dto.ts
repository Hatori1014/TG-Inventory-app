export interface ProductPriceComparisonSupplierDto {
  supplierId: string;
  supplierName: string;
  latestUnitPrice: number;
  latestPurchasedAt: string;
}

export interface ProductPriceComparisonResponseDto {
  productId: string;
  productName: string;
  suppliers: ProductPriceComparisonSupplierDto[];
}
