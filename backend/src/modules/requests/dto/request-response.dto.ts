export interface RequestItemResponseDto {
  id: string;
  productId: string;
  productName: string;
  locationId: string;
  locationName: string;
  quantity: number;
  estimatedPrice: number | null;
}

export interface RequestResponseDto {
  id: string;
  type: 'purchase' | 'consumption';
  status: string;
  requesterId: string;
  requesterName: string;
  supplierId: string | null;
  supplierName: string | null;
  createdAt: string;
  resolvedAt: string | null;
  notes: string | null;
  items: RequestItemResponseDto[];
}
