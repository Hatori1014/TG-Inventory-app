import { Prisma } from '@prisma/client';
import { PurchaseResponseDto } from '../dto/purchase-response.dto';

export const purchaseWithRelations = Prisma.validator<Prisma.PurchaseDefaultArgs>()({
  include: {
    supplier: { select: { id: true, name: true } },
    items: {
      include: {
        product: { select: { id: true, name: true } },
        location: { select: { id: true, name: true } },
        batch: { select: { id: true, batchNumber: true } },
      },
    },
  },
});
export type PurchaseWithRelations = Prisma.PurchaseGetPayload<typeof purchaseWithRelations>;

export function toPurchaseResponseDto(purchase: PurchaseWithRelations): PurchaseResponseDto {
  const items = purchase.items.map((item) => {
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unitPrice);
    return {
      id: item.id,
      productId: item.productId,
      productName: item.product.name,
      locationId: item.locationId,
      locationName: item.location.name,
      batchId: item.batchId,
      batchNumber: item.batch?.batchNumber ?? null,
      quantity,
      unitPrice,
      subtotal: quantity * unitPrice,
    };
  });

  return {
    id: purchase.id,
    supplierId: purchase.supplierId,
    supplierName: purchase.supplier.name,
    userId: purchase.userId,
    purchasedAt: purchase.purchasedAt.toISOString(),
    status: purchase.status,
    items,
    totalAmount: items.reduce((sum, item) => sum + item.subtotal, 0),
  };
}
