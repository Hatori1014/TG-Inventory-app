import { randomUUID } from 'crypto';
import { LocationStatus, SupplierStatus } from '@prisma/client';
import { RequestWithRelations } from '../../../src/modules/requests/application/request-response.mapper';
import { CreateRequestData, UpdateRequestData } from '../../../src/modules/requests/infrastructure/request.prisma.repository';

// In-memory stand-in for RequestPrismaRepository — never touches Postgres
// (CI has no database service). Same independent-per-endpoint reasoning as
// every other Fake in this suite.
export class FakeRequestRepository {
  private readonly suppliers = new Map<string, { name: string; status: SupplierStatus }>();
  private readonly products = new Map<string, string>();
  private readonly locations = new Map<string, { name: string; status: LocationStatus }>();
  private readonly requests = new Map<string, RequestWithRelations>();

  seedSupplier(id: string, name: string, status: SupplierStatus = 'active'): void {
    this.suppliers.set(id, { name, status });
  }

  seedProduct(id: string, name: string): void {
    this.products.set(id, name);
  }

  seedLocation(id: string, name: string, status: LocationStatus = 'active'): void {
    this.locations.set(id, { name, status });
  }

  async findSupplierStatus(supplierId: string): Promise<SupplierStatus | null> {
    return this.suppliers.get(supplierId)?.status ?? null;
  }

  async findProductName(productId: string): Promise<string | null> {
    return this.products.get(productId) ?? null;
  }

  async findLocationStatus(locationId: string): Promise<LocationStatus | null> {
    return this.locations.get(locationId)?.status ?? null;
  }

  async create(data: CreateRequestData): Promise<RequestWithRelations> {
    const supplier = data.supplierId ? this.suppliers.get(data.supplierId) : undefined;
    const request = {
      id: randomUUID(),
      type: data.type,
      requesterId: data.requesterId,
      requester: { id: data.requesterId, name: 'Requester' },
      supplierId: data.supplierId ?? null,
      supplier: data.supplierId ? { id: data.supplierId, name: supplier?.name ?? data.supplierId } : null,
      status: data.status,
      createdAt: new Date(),
      resolvedAt: null,
      notes: data.notes ?? null,
      items: data.items.map((item) => ({
        id: randomUUID(),
        productId: item.productId,
        product: { id: item.productId, name: this.products.get(item.productId) ?? item.productId },
        locationId: item.locationId,
        location: { id: item.locationId, name: this.locations.get(item.locationId)?.name ?? item.locationId },
        quantity: item.quantity,
        estimatedPrice: item.estimatedPrice ?? null,
      })),
    } as unknown as RequestWithRelations;
    this.requests.set(request.id, request);
    return request;
  }

  async update(id: string, data: UpdateRequestData): Promise<RequestWithRelations> {
    const existing = this.requests.get(id) as RequestWithRelations;
    const supplier = data.supplierId ? this.suppliers.get(data.supplierId) : undefined;
    const updated = {
      ...existing,
      supplierId: data.supplierId !== undefined ? data.supplierId : existing.supplierId,
      supplier:
        data.supplierId !== undefined
          ? data.supplierId
            ? { id: data.supplierId, name: supplier?.name ?? data.supplierId }
            : null
          : existing.supplier,
      notes: data.notes !== undefined ? data.notes : existing.notes,
      items: data.items
        ? data.items.map((item) => ({
            id: randomUUID(),
            productId: item.productId,
            product: { id: item.productId, name: this.products.get(item.productId) ?? item.productId },
            locationId: item.locationId,
            location: { id: item.locationId, name: this.locations.get(item.locationId)?.name ?? item.locationId },
            quantity: item.quantity,
            estimatedPrice: item.estimatedPrice ?? null,
          }))
        : existing.items,
    } as unknown as RequestWithRelations;
    this.requests.set(id, updated);
    return updated;
  }

  async updateStatus(id: string, status: string): Promise<RequestWithRelations> {
    const existing = this.requests.get(id) as RequestWithRelations;
    const updated = { ...existing, status } as unknown as RequestWithRelations;
    this.requests.set(id, updated);
    return updated;
  }

  async findById(id: string): Promise<RequestWithRelations | null> {
    return this.requests.get(id) ?? null;
  }

  async findAllPaginated(
    skip: number,
    take: number,
    filters: { requesterId?: string; type?: string; status?: string },
  ): Promise<{ items: RequestWithRelations[]; total: number }> {
    let all = [...this.requests.values()];
    if (filters.requesterId) all = all.filter((r) => r.requesterId === filters.requesterId);
    if (filters.type) all = all.filter((r) => r.type === filters.type);
    if (filters.status) all = all.filter((r) => r.status === filters.status);
    all = all.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return { items: all.slice(skip, skip + take), total: all.length };
  }
}
