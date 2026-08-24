import { Injectable } from '@nestjs/common';
import { ProductStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { productWithRelations, ProductWithRelations } from '../application/product-response.mapper';

export interface CreateProductData {
  name: string;
  description?: string;
  unitId: string;
  categoryId?: string;
  requiresBatch?: boolean;
}

export interface UpdateProductData {
  name?: string;
  description?: string;
  unitId?: string;
  categoryId?: string;
  status?: ProductStatus;
  requiresBatch?: boolean;
  // HU-26 — the R2 object key for the product's image, not a browsable
  // URL: the bucket is private (the user's explicit choice), so the
  // backend proxies it via GET /products/:id/image rather than a client
  // ever reading this value directly.
  imageUrl?: string;
}

// No domain/ layer — trivial CRUD (convenciones.md). Injected directly by
// class, no repository interface/Symbol port.
@Injectable()
export class ProductPrismaRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly include = productWithRelations.include;

  async findAllPaginated(
    skip: number,
    take: number,
  ): Promise<{ items: ProductWithRelations[]; total: number }> {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({ skip, take, include: this.include, orderBy: { name: 'asc' } }),
      this.prisma.product.count(),
    ]);
    return { items, total };
  }

  async findById(id: string): Promise<ProductWithRelations | null> {
    return this.prisma.product.findUnique({ where: { id }, include: this.include });
  }

  async create(data: CreateProductData): Promise<ProductWithRelations> {
    return this.prisma.product.create({
      data: {
        name: data.name,
        description: data.description,
        unitId: data.unitId,
        categoryId: data.categoryId,
        requiresBatch: data.requiresBatch,
      },
      include: this.include,
    });
  }

  async update(id: string, data: UpdateProductData): Promise<ProductWithRelations> {
    return this.prisma.product.update({
      where: { id },
      data,
      include: this.include,
    });
  }
}
