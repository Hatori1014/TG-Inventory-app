import { Injectable } from '@nestjs/common';
import { SupplierStatus, LocationStatus, RequestStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { requestWithRelations, RequestWithRelations } from '../application/request-response.mapper';

export interface CreateRequestItemData {
  productId: string;
  locationId: string;
  quantity: number;
  estimatedPrice?: number;
}

export interface CreateRequestData {
  type: 'purchase' | 'consumption';
  requesterId: string;
  supplierId?: string;
  status: RequestStatus;
  notes?: string;
  items: CreateRequestItemData[];
}

export interface UpdateRequestData {
  supplierId?: string | null;
  notes?: string | null;
  items?: CreateRequestItemData[];
}

// No domain/ layer here for pure persistence — the real business rules
// (what makes a request submittable, HU-16's stock check) live in
// domain/ and the use-cases; this is IO only (ADR-17).
@Injectable()
export class RequestPrismaRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Duplicated trivial reads (ADR-18) — same rationale as every other
  // module that needs a cheap existence/status check on another module's
  // entity without importing its infrastructure/.
  async findSupplierStatus(supplierId: string): Promise<SupplierStatus | null> {
    const supplier = await this.prisma.supplier.findUnique({ where: { id: supplierId }, select: { status: true } });
    return supplier?.status ?? null;
  }

  async findProductName(productId: string): Promise<string | null> {
    const product = await this.prisma.product.findUnique({ where: { id: productId }, select: { name: true } });
    return product?.name ?? null;
  }

  async findLocationStatus(locationId: string): Promise<LocationStatus | null> {
    const location = await this.prisma.location.findUnique({ where: { id: locationId }, select: { status: true } });
    return location?.status ?? null;
  }

  // HU-16 — sums across every batch at this exact (productId, locationId)
  // pair, same "SUM, not a single row" reasoning as HU-12's alerts (a
  // requiresBatch product's stock at one location can be split across
  // several LocationStock rows, one per batch).
  async findAvailableStock(productId: string, locationId: string): Promise<number> {
    const result = await this.prisma.locationStock.aggregate({
      where: { productId, locationId },
      _sum: { quantity: true },
    });
    return Number(result._sum.quantity ?? 0);
  }

  async create(data: CreateRequestData): Promise<RequestWithRelations> {
    return this.prisma.request.create({
      data: {
        type: data.type,
        requesterId: data.requesterId,
        supplierId: data.supplierId,
        status: data.status,
        notes: data.notes,
        items: {
          create: data.items.map((item) => ({
            productId: item.productId,
            locationId: item.locationId,
            quantity: item.quantity,
            estimatedPrice: item.estimatedPrice,
          })),
        },
      },
      include: requestWithRelations.include,
    });
  }

  // Full replace of items on edit — same reasoning as a draft being a
  // work-in-progress form: simpler and safer than diffing individual rows
  // for something that isn't ever concurrently edited by two people.
  async update(id: string, data: UpdateRequestData): Promise<RequestWithRelations> {
    return this.prisma.$transaction(async (tx) => {
      if (data.items) {
        await tx.requestItem.deleteMany({ where: { requestId: id } });
      }
      return tx.request.update({
        where: { id },
        data: {
          supplierId: data.supplierId,
          notes: data.notes,
          ...(data.items && {
            items: {
              create: data.items.map((item) => ({
                productId: item.productId,
                locationId: item.locationId,
                quantity: item.quantity,
                estimatedPrice: item.estimatedPrice,
              })),
            },
          }),
        },
        include: requestWithRelations.include,
      });
    });
  }

  async updateStatus(id: string, status: RequestStatus): Promise<RequestWithRelations> {
    return this.prisma.request.update({
      where: { id },
      data: { status },
      include: requestWithRelations.include,
    });
  }

  async findById(id: string): Promise<RequestWithRelations | null> {
    return this.prisma.request.findUnique({ where: { id }, include: requestWithRelations.include });
  }

  async findAllPaginated(
    skip: number,
    take: number,
    filters: { requesterId?: string; type?: string; status?: string },
  ): Promise<{ items: RequestWithRelations[]; total: number }> {
    const where = {
      ...(filters.requesterId && { requesterId: filters.requesterId }),
      ...(filters.type && { type: filters.type as 'purchase' | 'consumption' }),
      ...(filters.status && { status: filters.status as RequestStatus }),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.request.findMany({ where, skip, take, orderBy: { createdAt: 'desc' }, include: requestWithRelations.include }),
      this.prisma.request.count({ where }),
    ]);
    return { items, total };
  }
}
