export interface StockAlertResponseDto {
  productId: string;
  productName: string;
  minimumQuantity: number;
  totalQuantity: number;
  deficit: number;
}
