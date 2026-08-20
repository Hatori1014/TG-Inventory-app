import { Prisma } from '@prisma/client';
import { MinimumStockResponseDto } from '../dto/minimum-stock-response.dto';

export const minimumStockWithProduct = Prisma.validator<Prisma.MinimumStockDefaultArgs>()({
  include: { product: { select: { id: true, name: true } } },
});
export type MinimumStockWithProduct = Prisma.MinimumStockGetPayload<typeof minimumStockWithProduct>;

export function toMinimumStockResponseDto(minimumStock: MinimumStockWithProduct): MinimumStockResponseDto {
  return {
    id: minimumStock.id,
    productId: minimumStock.productId,
    productName: minimumStock.product.name,
    minimumQuantity: Number(minimumStock.minimumQuantity),
  };
}
