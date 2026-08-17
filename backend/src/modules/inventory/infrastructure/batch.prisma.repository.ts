import { Injectable } from '@nestjs/common';
import { Batch } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';

// No domain/ layer for Batch itself — creating a batch is trivial CRUD
// (convenciones.md carve-out); the real business rule ("only if the
// product requires it", "batchId must belong to productId") lives in the
// use-cases / RegisterMovementUseCase, not here.
@Injectable()
export class BatchPrismaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: { productId: string; batchNumber: string; expiresAt?: string; receivedAt?: string }): Promise<Batch> {
    return this.prisma.batch.create({
      data: {
        productId: data.productId,
        batchNumber: data.batchNumber,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
        receivedAt: data.receivedAt ? new Date(data.receivedAt) : undefined,
      },
    });
  }

  async findByProductPaginated(
    productId: string,
    skip: number,
    take: number,
  ): Promise<{ items: Batch[]; total: number }> {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.batch.findMany({ where: { productId }, skip, take, orderBy: { receivedAt: 'desc' } }),
      this.prisma.batch.count({ where: { productId } }),
    ]);
    return { items, total };
  }
}
