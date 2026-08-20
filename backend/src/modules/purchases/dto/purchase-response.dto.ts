export interface PurchaseItemResponseDto {
  id: string;
  productId: string;
  productName: string;
  locationId: string;
  locationName: string;
  batchId: string | null;
  batchNumber: string | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface PurchaseResponseDto {
  id: string;
  supplierId: string;
  supplierName: string;
  userId: string;
  purchasedAt: string;
  status: 'registered' | 'received';
  items: PurchaseItemResponseDto[];
  totalAmount: number;
}
