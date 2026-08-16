import { BadRequestException, ConflictException } from '@nestjs/common';
import { RegisterMovementUseCase } from './register-movement.use-case';
import { InventoryPrismaRepository, InsufficientStockError } from '../../infrastructure/inventory.prisma.repository';

describe('RegisterMovementUseCase', () => {
  let useCase: RegisterMovementUseCase;
  let repository: jest.Mocked<InventoryPrismaRepository>;

  const baseDto = { productId: 'p1', locationId: 'l1', type: 'in' as const, quantity: 10 };

  beforeEach(() => {
    repository = {
      findLocationStatus: jest.fn(),
      registerMovement: jest.fn(),
      findStockPaginated: jest.fn(),
    } as unknown as jest.Mocked<InventoryPrismaRepository>;
    useCase = new RegisterMovementUseCase(repository);
  });

  it('registers an "in" movement against a valid, active location', async () => {
    repository.findLocationStatus.mockResolvedValue('active');
    repository.registerMovement.mockResolvedValue({
      movement: {
        id: 'mv-1',
        productId: 'p1',
        locationId: 'l1',
        batchId: null,
        type: 'in',
        quantity: 10,
        userId: 'u1',
        occurredAt: new Date('2026-08-16T00:00:00Z'),
        notes: null,
        purchaseId: null,
        requestId: null,
      } as any,
      stock: { id: 'stock-1', quantity: 10 } as any,
    });

    const result = await useCase.execute(baseDto, 'u1');

    expect(repository.registerMovement).toHaveBeenCalledWith({
      productId: 'p1',
      locationId: 'l1',
      batchId: undefined,
      type: 'in',
      quantity: 10,
      delta: 10,
      userId: 'u1',
      notes: undefined,
    });
    expect(result.id).toBe('mv-1');
    expect(result.quantity).toBe(10);
  });

  it('registers an "out" movement with a negative delta', async () => {
    repository.findLocationStatus.mockResolvedValue('active');
    repository.registerMovement.mockResolvedValue({
      movement: { id: 'mv-2', type: 'out', quantity: 10 } as any,
      stock: { id: 'stock-1', quantity: 5 } as any,
    });

    await useCase.execute({ ...baseDto, type: 'out' }, 'u1');

    expect(repository.registerMovement).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'out', delta: -10 }),
    );
  });

  it('registers an "adjustment" with direction "increase" as a positive delta', async () => {
    repository.findLocationStatus.mockResolvedValue('active');
    repository.registerMovement.mockResolvedValue({
      movement: { id: 'mv-3', type: 'adjustment', quantity: 5 } as any,
      stock: { id: 'stock-1', quantity: 15 } as any,
    });

    await useCase.execute({ ...baseDto, type: 'adjustment', quantity: 5, direction: 'increase' }, 'u1');

    expect(repository.registerMovement).toHaveBeenCalledWith(expect.objectContaining({ delta: 5 }));
  });

  it('registers an "adjustment" with direction "decrease" as a negative delta', async () => {
    repository.findLocationStatus.mockResolvedValue('active');
    repository.registerMovement.mockResolvedValue({
      movement: { id: 'mv-4', type: 'adjustment', quantity: 5 } as any,
      stock: { id: 'stock-1', quantity: 5 } as any,
    });

    await useCase.execute({ ...baseDto, type: 'adjustment', quantity: 5, direction: 'decrease' }, 'u1');

    expect(repository.registerMovement).toHaveBeenCalledWith(expect.objectContaining({ delta: -5 }));
  });

  it('throws ConflictException when there is insufficient stock for a decrease', async () => {
    repository.findLocationStatus.mockResolvedValue('active');
    repository.registerMovement.mockRejectedValue(new InsufficientStockError());

    await expect(useCase.execute({ ...baseDto, type: 'out' }, 'u1')).rejects.toThrow(ConflictException);
  });

  it('throws BadRequestException when the location does not exist', async () => {
    repository.findLocationStatus.mockResolvedValue(null);

    await expect(useCase.execute(baseDto, 'u1')).rejects.toThrow(BadRequestException);
    expect(repository.registerMovement).not.toHaveBeenCalled();
  });

  it('throws BadRequestException when the location is inactive', async () => {
    repository.findLocationStatus.mockResolvedValue('inactive');

    await expect(useCase.execute(baseDto, 'u1')).rejects.toThrow(BadRequestException);
    expect(repository.registerMovement).not.toHaveBeenCalled();
  });

  it('throws BadRequestException when productId does not exist (P2003)', async () => {
    repository.findLocationStatus.mockResolvedValue('active');
    repository.registerMovement.mockRejectedValue({ code: 'P2003' });

    await expect(useCase.execute(baseDto, 'u1')).rejects.toThrow(BadRequestException);
  });

  it('rejects a non-positive quantity before touching the repository', async () => {
    repository.findLocationStatus.mockResolvedValue('active');

    await expect(useCase.execute({ ...baseDto, quantity: 0 }, 'u1')).rejects.toThrow(
      'Movement quantity must be a positive number',
    );
    expect(repository.findLocationStatus).not.toHaveBeenCalled();
  });

  it('rethrows any other error unchanged', async () => {
    repository.findLocationStatus.mockResolvedValue('active');
    const unexpected = new Error('database is down');
    repository.registerMovement.mockRejectedValue(unexpected);

    await expect(useCase.execute(baseDto, 'u1')).rejects.toThrow(unexpected);
  });
});
