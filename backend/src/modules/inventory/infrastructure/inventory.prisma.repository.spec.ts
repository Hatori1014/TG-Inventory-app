import { ConflictException } from '@nestjs/common';
import { InventoryPrismaRepository, InsufficientStockError } from './inventory.prisma.repository';

describe('InventoryPrismaRepository', () => {
  let prisma: any;
  let repository: InventoryPrismaRepository;

  beforeEach(() => {
    prisma = {
      location: { findUnique: jest.fn() },
      locationStock: { findMany: jest.fn(), count: jest.fn() },
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

    it('throws InsufficientStockError, without attempting the update, when a decrease would go negative', async () => {
      const tx = {
        inventoryMovement: { create: jest.fn().mockResolvedValue({ id: 'mv' }) },
        locationStock: {
          findFirst: jest.fn().mockResolvedValue({ id: 'stock-1', version: 1, quantity: 5 }),
          updateMany: jest.fn(),
        },
      };
      prisma.$transaction.mockImplementation((cb: any) => cb(tx));

      await expect(
        repository.registerMovement({ ...baseInput, type: 'out', delta: -10 }),
      ).rejects.toBeInstanceOf(InsufficientStockError);
      expect(tx.locationStock.updateMany).not.toHaveBeenCalled();
    });

    it('throws InsufficientStockError when decreasing stock that has no LocationStock row yet', async () => {
      const tx = {
        inventoryMovement: { create: jest.fn().mockResolvedValue({ id: 'mv' }) },
        locationStock: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn(),
        },
      };
      prisma.$transaction.mockImplementation((cb: any) => cb(tx));

      await expect(
        repository.registerMovement({ ...baseInput, type: 'out', delta: -10 }),
      ).rejects.toBeInstanceOf(InsufficientStockError);
      expect(tx.locationStock.create).not.toHaveBeenCalled();
    });
  });

  describe('registerTransfer', () => {
    const baseTransferInput = {
      productId: 'p1',
      sourceLocationId: 'l1',
      destinationLocationId: 'l2',
      quantity: 10,
      userId: 'u1',
    };

    it('creates transfer_out at the source and transfer_in at the destination in one transaction', async () => {
      const tx = {
        inventoryMovement: {
          create: jest
            .fn()
            .mockResolvedValueOnce({ id: 'mv-out', type: 'transfer_out', locationId: 'l1' })
            .mockResolvedValueOnce({ id: 'mv-in', type: 'transfer_in', locationId: 'l2' }),
        },
        locationStock: {
          findFirst: jest
            .fn()
            .mockResolvedValueOnce({ id: 's1', version: 0, quantity: 20 }) // source read
            .mockResolvedValueOnce(null), // destination read (no row yet)
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 's1', version: 1, quantity: 10 }),
          create: jest.fn().mockResolvedValue({ id: 's2', quantity: 10 }),
        },
      };
      prisma.$transaction.mockImplementation((cb: any) => cb(tx));

      const result = await repository.registerTransfer(baseTransferInput);

      expect(tx.inventoryMovement.create).toHaveBeenNthCalledWith(1, {
        data: {
          productId: 'p1',
          locationId: 'l1',
          batchId: undefined,
          type: 'transfer_out',
          quantity: 10,
          userId: 'u1',
          notes: undefined,
        },
      });
      expect(tx.inventoryMovement.create).toHaveBeenNthCalledWith(2, {
        data: {
          productId: 'p1',
          locationId: 'l2',
          batchId: undefined,
          type: 'transfer_in',
          quantity: 10,
          userId: 'u1',
          notes: undefined,
        },
      });
      expect(result.outMovement.id).toBe('mv-out');
      expect(result.inMovement.id).toBe('mv-in');
      expect(result.sourceStock.quantity).toBe(10);
      expect(result.destinationStock.quantity).toBe(10);
    });

    it('rolls back both legs when the source has insufficient stock', async () => {
      const tx = {
        inventoryMovement: { create: jest.fn().mockResolvedValue({ id: 'mv-out' }) },
        locationStock: {
          findFirst: jest.fn().mockResolvedValueOnce({ id: 's1', version: 0, quantity: 5 }),
          updateMany: jest.fn(),
          create: jest.fn(),
        },
      };
      prisma.$transaction.mockImplementation((cb: any) => cb(tx));

      await expect(repository.registerTransfer({ ...baseTransferInput, quantity: 10 })).rejects.toBeInstanceOf(
        InsufficientStockError,
      );
      // Only the source leg was attempted — the destination create/update
      // was never reached because the source check threw first, and
      // Prisma's real $transaction would roll back the outMovement insert
      // too (verified structurally here since our mock re-invokes the same
      // callback; the real rollback guarantee itself is Prisma's).
      expect(tx.locationStock.create).not.toHaveBeenCalled();
    });
  });

  describe('findStockPaginated', () => {
    it('queries with no where filter when none is provided', async () => {
      prisma.$transaction.mockResolvedValue([[{ id: 's1' }], 1]);

      const result = await repository.findStockPaginated(0, 20);

      expect(prisma.locationStock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
          skip: 0,
          take: 20,
          include: {
            product: { select: { id: true, name: true } },
            location: { select: { id: true, name: true } },
          },
        }),
      );
      expect(prisma.locationStock.count).toHaveBeenCalledWith({ where: {} });
      expect(result).toEqual({ items: [{ id: 's1' }], total: 1 });
    });

    it('applies productId/locationId filters to both findMany and count when provided', async () => {
      prisma.$transaction.mockResolvedValue([[], 0]);

      await repository.findStockPaginated(0, 20, { productId: 'p1', locationId: 'l1' });

      expect(prisma.locationStock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { productId: 'p1', locationId: 'l1' } }),
      );
      expect(prisma.locationStock.count).toHaveBeenCalledWith({ where: { productId: 'p1', locationId: 'l1' } });
    });
  });
});
