import { BatchPrismaRepository } from './batch.prisma.repository';

describe('BatchPrismaRepository', () => {
  let prisma: any;
  let repository: BatchPrismaRepository;

  beforeEach(() => {
    prisma = {
      batch: { create: jest.fn(), findMany: jest.fn(), count: jest.fn() },
      $transaction: jest.fn(),
    };
    repository = new BatchPrismaRepository(prisma);
  });

  describe('create', () => {
    it('creates a batch with expiresAt/receivedAt parsed as Dates when provided', async () => {
      prisma.batch.create.mockResolvedValue({ id: 'b1' });

      await repository.create({
        productId: 'p1',
        batchNumber: 'LOT-1',
        expiresAt: '2026-12-31',
        receivedAt: '2026-08-01',
      });

      expect(prisma.batch.create).toHaveBeenCalledWith({
        data: {
          productId: 'p1',
          batchNumber: 'LOT-1',
          expiresAt: new Date('2026-12-31'),
          receivedAt: new Date('2026-08-01'),
        },
      });
    });

    it('leaves expiresAt/receivedAt undefined when not provided (DB default applies)', async () => {
      prisma.batch.create.mockResolvedValue({ id: 'b1' });

      await repository.create({ productId: 'p1', batchNumber: 'LOT-1' });

      expect(prisma.batch.create).toHaveBeenCalledWith({
        data: { productId: 'p1', batchNumber: 'LOT-1', expiresAt: undefined, receivedAt: undefined },
      });
    });
  });

  describe('findByProductPaginated', () => {
    it('returns items and total scoped to the given productId', async () => {
      prisma.$transaction.mockResolvedValue([[{ id: 'b1' }], 1]);

      const result = await repository.findByProductPaginated('p1', 0, 20);

      expect(prisma.batch.findMany).toHaveBeenCalledWith({
        where: { productId: 'p1' },
        skip: 0,
        take: 20,
        orderBy: { receivedAt: 'desc' },
      });
      expect(prisma.batch.count).toHaveBeenCalledWith({ where: { productId: 'p1' } });
      expect(result).toEqual({ items: [{ id: 'b1' }], total: 1 });
    });
  });
});
