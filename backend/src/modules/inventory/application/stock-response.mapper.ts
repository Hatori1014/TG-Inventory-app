import { LocationStock } from '@prisma/client';
import { StockResponseDto } from '../dto/stock-response.dto';

export type StockWithNames = LocationStock & {
  product: { id: string; name: string };
  location: { id: string; name: string };
};

export function toStockResponseDto(stock: StockWithNames): StockResponseDto {
  return {
    id: stock.id,
    product: stock.product,
    location: stock.location,
    batchId: stock.batchId,
    quantity: Number(stock.quantity),
  };
}
