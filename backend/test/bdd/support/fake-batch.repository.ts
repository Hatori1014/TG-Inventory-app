import { randomUUID } from 'crypto';

// In-memory stand-in for BatchPrismaRepository — never touches Postgres
// (CI has no database service). Deliberately independent from
// FakeInventoryRepository's own batch bookkeeping (used for the movement-
// validation scenarios): these two exercise different endpoints
// (/inventory/batches vs /inventory/movements) and BDD scenarios seed each
// fake directly rather than chaining real HTTP calls between them.
export class FakeBatchRepository {
  private readonly batches: any[] = [];

  async create(data: { productId: string; batchNumber: string; expiresAt?: string; receivedAt?: string }) {
    const batch = {
      id: randomUUID(),
      productId: data.productId,
      batchNumber: data.batchNumber,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      receivedAt: data.receivedAt ? new Date(data.receivedAt) : new Date(),
    };
    this.batches.push(batch);
    return batch;
  }

  async findByProductPaginated(productId: string, skip: number, take: number) {
    const items = this.batches.filter((b) => b.productId === productId);
    return { items: items.slice(skip, skip + take), total: items.length };
  }
}
