// Mirrors the backend DTOs (plan section 7.4, HU-14) — keep in sync by hand
// until it's worth sharing a types package between backend/ and frontend/.
export interface ProductPriceComparisonSupplier {
  supplierId: string;
  supplierName: string;
  latestUnitPrice: number;
  latestPurchasedAt: string;
}

export interface ProductPriceComparison {
  productId: string;
  productName: string;
  suppliers: ProductPriceComparisonSupplier[];
}

export interface SupplierPriceComparisonSupplier {
  supplierId: string;
  supplierName: string;
}

export interface SupplierPriceComparisonRow {
  month: string;
  averageBySupplier: Record<string, number | null>;
}

export interface SupplierPriceComparison {
  suppliers: SupplierPriceComparisonSupplier[];
  rows: SupplierPriceComparisonRow[];
}
