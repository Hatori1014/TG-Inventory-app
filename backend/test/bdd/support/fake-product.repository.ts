import { randomUUID } from 'crypto';
import { ProductStatus } from '@prisma/client';
import { FakeUnitRepository } from './fake-unit.repository';
import { FakeCategoryRepository } from './fake-category.repository';
import { ProductWithRelations } from '../../../src/modules/products/application/product-response.mapper';

interface CreateProductData {
  name: string;
  description?: string;
  unitId: string;
  categoryId?: string;
}

interface UpdateProductData {
  name?: string;
  description?: string;
  unitId?: string;
  categoryId?: string;
  status?: ProductStatus;
  imageUrl?: string;
}

// In-memory stand-in for ProductPrismaRepository — never touches Postgres
// (CI has no database service). Depends on FakeUnitRepository/
// FakeCategoryRepository to resolve unitId/categoryId into the joined
// unit/category objects the real repository's `include` would return.
export class FakeProductRepository {
  private readonly products = new Map<string, ProductWithRelations>();

  constructor(
    private readonly unitRepository: FakeUnitRepository,
    private readonly categoryRepository: FakeCategoryRepository,
  ) {}

  async findAllPaginated(
    skip: number,
    take: number,
  ): Promise<{ items: ProductWithRelations[]; total: number }> {
    const all = [...this.products.values()];
    return { items: all.slice(skip, skip + take), total: all.length };
  }

  async findById(id: string): Promise<ProductWithRelations | null> {
    return this.products.get(id) ?? null;
  }

  async create(data: CreateProductData): Promise<ProductWithRelations> {
    const unit = await this.unitRepository.findById(data.unitId);
    if (!unit) {
      throw { code: 'P2003' };
    }
    const category = data.categoryId ? await this.categoryRepository.findById(data.categoryId) : null;
    if (data.categoryId && !category) {
      throw { code: 'P2003' };
    }

    const product: ProductWithRelations = {
      id: randomUUID(),
      name: data.name,
      description: data.description ?? null,
      unitId: data.unitId,
      unit,
      categoryId: data.categoryId ?? null,
      category,
      requiresBatch: false,
      imageUrl: null,
      status: 'active',
    };
    this.products.set(product.id, product);
    return product;
  }

  async update(id: string, data: UpdateProductData): Promise<ProductWithRelations> {
    const existing = this.products.get(id);
    if (!existing) {
      throw new Error(`Product ${id} not found`);
    }

    let unit = existing.unit;
    let unitId = existing.unitId;
    if (data.unitId) {
      const found = await this.unitRepository.findById(data.unitId);
      if (!found) {
        throw { code: 'P2003' };
      }
      unit = found;
      unitId = data.unitId;
    }

    let category = existing.category;
    let categoryId = existing.categoryId;
    if (data.categoryId) {
      const found = await this.categoryRepository.findById(data.categoryId);
      if (!found) {
        throw { code: 'P2003' };
      }
      category = found;
      categoryId = data.categoryId;
    }

    const updated: ProductWithRelations = {
      ...existing,
      name: data.name ?? existing.name,
      description: data.description ?? existing.description,
      unitId,
      unit,
      categoryId,
      category,
      status: data.status ?? existing.status,
      imageUrl: data.imageUrl ?? existing.imageUrl,
    };
    this.products.set(id, updated);
    return updated;
  }
}
