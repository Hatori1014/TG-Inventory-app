export interface SupplierPriceComparisonSupplierDto {
  supplierId: string;
  supplierName: string;
}

export interface SupplierPriceComparisonRowDto {
  month: string;
  averageBySupplier: Record<string, number | null>;
}

export interface SupplierPriceComparisonResponseDto {
  suppliers: SupplierPriceComparisonSupplierDto[];
  rows: SupplierPriceComparisonRowDto[];
}
