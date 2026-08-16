import { LocationStock } from '@prisma/client';
import { StockResponseDto } from '../dto/stock-response.dto';

export function toStockResponseDto(stock: LocationStock): StockResponseDto {
  return {
    id: stock.id,
    productId: stock.productId,
    locationId: stock.locationId,
    batchId: stock.batchId,
    quantity: Number(stock.quantity),
  };
}
