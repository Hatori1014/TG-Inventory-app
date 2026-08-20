import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { minimumStockWithProduct, MinimumStockWithProduct } from '../application/minimum-stock-response.mapper';
import { ProductStockSummary } from '../domain/stock-alert.util';

// No domain/ layer for MinimumStock itself — defining/editing a threshold
// is trivial CRUD (convenciones.md carve-out), same reasoning as Batch.
// The real logic (what counts as "in alert", sorted how) lives in
// domain/stock-alert.util.ts, consumed by ListAlertsUseCase below.
@Injectable()
export class MinimumStockPrismaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findProductName(productId: string): Promise<string | null> {
    const product = await this.prisma.product.findUnique({ where: { id: productId }, select: { name: true } });
    return product?.name ?? null;
  }

  async create(data: { productId: string; minimumQuantity: number }): Promise<MinimumStockWithProduct> {
    return this.prisma.minimumStock.create({
      data: { productId: data.productId, minimumQuantity: data.minimumQuantity },
      include: minimumStockWithProduct.include,
    });
  }

  async update(id: string, minimumQuantity: number): Promise<MinimumStockWithProduct> {
    return this.prisma.minimumStock.update({
      where: { id },
      data: { minimumQuantity },
      include: minimumStockWithProduct.include,
    });
  }

  async findById(id: string): Promise<MinimumStockWithProduct | null> {
    return this.prisma.minimumStock.findUnique({ where: { id }, include: minimumStockWithProduct.include });
  }

  async findByProductId(productId: string): Promise<MinimumStockWithProduct | null> {
    return this.prisma.minimumStock.findUnique({ where: { productId }, include: minimumStockWithProduct.include });
  }

  async findAllPaginated(skip: number, take: number): Promise<{ items: MinimumStockWithProduct[]; total: number }> {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.minimumStock.findMany({
        skip,
        take,
        orderBy: { product: { name: 'asc' } },
        include: minimumStockWithProduct.include,
      }),
      this.prisma.minimumStock.count(),
    ]);
    return { items, total };
  }

  // HU-12 — every product with a minimum defined, plus its real stock
  // summed across every location and batch (groupBy, not a single
  // LocationStock row: the threshold is per product, not per
  // product+location). A product with zero LocationStock rows anywhere
  // just doesn't appear in the groupBy result — defaulted to 0 here so it
  // still alerts against a positive minimum, per the user's explicit case.
  async findAllWithStockSums(): Promise<ProductStockSummary[]> {
    const [minimums, sums] = await this.prisma.$transaction([
      this.prisma.minimumStock.findMany({ include: minimumStockWithProduct.include }),
      this.prisma.locationStock.groupBy({ by: ['productId'], _sum: { quantity: true }, orderBy: { productId: 'asc' } }),
    ]);
    const sumByProduct = new Map(sums.map((s) => [s.productId, Number(s._sum?.quantity ?? 0)]));
    return minimums.map((m) => ({
      productId: m.productId,
      productName: m.product.name,
      minimumQuantity: Number(m.minimumQuantity),
      totalQuantity: sumByProduct.get(m.productId) ?? 0,
    }));
  }
}
