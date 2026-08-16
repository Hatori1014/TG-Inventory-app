import { ConflictException } from '@nestjs/common';
import { InventoryPrismaRepository } from './inventory.prisma.repository';

describe('InventoryPrismaRepository', () => {
  let prisma: any;
  let repository: InventoryPrismaRepository;

  beforeEach(() => {
    prisma = {
      location: { findUnique: jest.fn() },
      $transaction: jest.fn(),
    };
    repository = new InventoryPrismaRepository(prisma);
  });

  describe('findLocationStatus', () => {
    it('returns the location status when it exists', async () => {
      prisma.location.findUnique.mockResolvedValue({ status: 'active' });

      await expect(repository.findLocationStatus('loc-1')).resolves.toBe('active');
    });

    it('returns null when the location does not exist', async () => {
      prisma.location.findUnique.mockResolvedValue(null);

      await expect(repository.findLocationStatus('missing')).resolves.toBeNull();
    });
  });

  describe('registerMovement', () => {
    const baseInput = {
      productId: 'p1',
      locationId: 'l1',
      type: 'in' as const,
      quantity: 10,
      delta: 10,
      userId: 'u1',
    };

    it('creates a new LocationStock row when none exists yet for that product+location+batch', async () => {
      const tx = {
        inventoryMovement: { create: jest.fn().mockResolvedValue({ id: 'mv-1' }) },
        locationStock: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({ id: 'stock-1', quantity: 10, version: 0 }),
        },
      };
      prisma.$transaction.mockImplementation((cb: any) => cb(tx));

      const result = await repository.registerMovement(baseInput);

      expect(tx.locationStock.create).toHaveBeenCalledWith({
        data: { productId: 'p1', locationId: 'l1', batchId: undefined, quantity: 10 },
      });
      expect(result.stock.quantity).toBe(10);
      expect(result.movement.id).toBe('mv-1');
    });

    it('increments an existing LocationStock row via the version filter on the first try', async () => {
      const tx = {
        inventoryMovement: { create: jest.fn().mockResolvedValue({ id: 'mv-1' }) },
        locationStock: {
          findFirst: jest.fn().mockResolvedValue({ id: 'stock-1', version: 2, quantity: 5 }),
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'stock-1', version: 3, quantity: 15 }),
        },
      };
      prisma.$transaction.mockImplementation((cb: any) => cb(tx));

      const result = await repository.registerMovement(baseInput);

      expect(tx.locationStock.updateMany).toHaveBeenCalledWith({
        where: { id: 'stock-1', version: 2 },
        data: { quantity: { increment: 10 }, version: { increment: 1 } },
      });
      expect(result.stock.quantity).toBe(15);
    });

    it('rolls back and retries the whole transaction on a version conflict, then succeeds', async () => {
      let attempt = 0;
      prisma.$transaction.mockImplementation(async (cb: any) => {
        attempt++;
        const tx = {
          inventoryMovement: { create: jest.fn().mockResolvedValue({ id: `mv-${attempt}` }) },
          locationStock: {
            findFirst: jest.fn().mockResolvedValue({ id: 'stock-1', version: attempt }),
            updateMany: jest.fn().mockResolvedValue({ count: attempt === 1 ? 0 : 1 }),
            findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'stock-1', version: attempt + 1, quantity: 20 }),
          },
        };
        return cb(tx);
      });

      const result = await repository.registerMovement(baseInput);

      expect(attempt).toBe(2);
      expect(result.stock.quantity).toBe(20);
    });

    it('throws ConflictException after exhausting retries on a persistent version conflict', async () => {
      prisma.$transaction.mockImplementation(async (cb: any) => {
        const tx = {
          inventoryMovement: { create: jest.fn().mockResolvedValue({ id: 'mv' }) },
          locationStock: {
            findFirst: jest.fn().mockResolvedValue({ id: 'stock-1', version: 1 }),
            updateMany: jest.fn().mockResolvedValue({ count: 0 }),
          },
        };
        return cb(tx);
      });

      await expect(repository.registerMovement(baseInput)).rejects.toBeInstanceOf(ConflictException);
    });
  });
});
