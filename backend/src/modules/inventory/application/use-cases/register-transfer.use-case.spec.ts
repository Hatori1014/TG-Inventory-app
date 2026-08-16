import { BadRequestException, ConflictException } from '@nestjs/common';
import { RegisterTransferUseCase } from './register-transfer.use-case';
import { InventoryPrismaRepository, InsufficientStockError } from '../../infrastructure/inventory.prisma.repository';

describe('RegisterTransferUseCase', () => {
  let useCase: RegisterTransferUseCase;
  let repository: jest.Mocked<InventoryPrismaRepository>;

  const baseDto = {
    productId: 'p1',
    locationId: 'l1',
    destinationLocationId: 'l2',
    type: 'transfer' as const,
    quantity: 10,
  };

  beforeEach(() => {
    repository = {
      findLocationStatus: jest.fn(),
      registerMovement: jest.fn(),
      registerTransfer: jest.fn(),
      findStockPaginated: jest.fn(),
    } as unknown as jest.Mocked<InventoryPrismaRepository>;
    useCase = new RegisterTransferUseCase(repository);
  });

  it('transfers stock between two valid, active locations', async () => {
    repository.findLocationStatus.mockImplementation(async (id: string) => (id === 'l1' || id === 'l2' ? 'active' : null));
    repository.registerTransfer.mockResolvedValue({
      outMovement: { id: 'mv-out', type: 'transfer_out', locationId: 'l1', quantity: 10 } as any,
      inMovement: { id: 'mv-in', type: 'transfer_in', locationId: 'l2', quantity: 10 } as any,
      sourceStock: { id: 's1', quantity: 0 } as any,
      destinationStock: { id: 's2', quantity: 10 } as any,
    });

    const result = await useCase.execute(baseDto, 'u1');

    expect(repository.registerTransfer).toHaveBeenCalledWith({
      productId: 'p1',
      sourceLocationId: 'l1',
      destinationLocationId: 'l2',
      batchId: undefined,
      quantity: 10,
      userId: 'u1',
      notes: undefined,
    });
    expect(result.out.id).toBe('mv-out');
    expect(result.in.id).toBe('mv-in');
  });

  it('throws BadRequestException when destinationLocationId is missing', async () => {
    await expect(useCase.execute({ ...baseDto, destinationLocationId: undefined }, 'u1')).rejects.toThrow(
      BadRequestException,
    );
    expect(repository.findLocationStatus).not.toHaveBeenCalled();
  });

  it('throws BadRequestException when the destination is the same as the source', async () => {
    await expect(useCase.execute({ ...baseDto, destinationLocationId: 'l1' }, 'u1')).rejects.toThrow(
      BadRequestException,
    );
    expect(repository.findLocationStatus).not.toHaveBeenCalled();
  });

  it('throws BadRequestException when the source location does not exist', async () => {
    repository.findLocationStatus.mockImplementation(async (id: string) => (id === 'l2' ? 'active' : null));

    await expect(useCase.execute(baseDto, 'u1')).rejects.toThrow(BadRequestException);
    expect(repository.registerTransfer).not.toHaveBeenCalled();
  });

  it('throws BadRequestException when the destination location is inactive', async () => {
    repository.findLocationStatus.mockImplementation(async (id: string) =>
      id === 'l1' ? 'active' : 'inactive',
    );

    await expect(useCase.execute(baseDto, 'u1')).rejects.toThrow(BadRequestException);
    expect(repository.registerTransfer).not.toHaveBeenCalled();
  });

  it('throws ConflictException when the source has insufficient stock', async () => {
    repository.findLocationStatus.mockResolvedValue('active');
    repository.registerTransfer.mockRejectedValue(new InsufficientStockError());

    await expect(useCase.execute(baseDto, 'u1')).rejects.toThrow(ConflictException);
  });

  it('throws BadRequestException when productId does not exist (P2003)', async () => {
    repository.findLocationStatus.mockResolvedValue('active');
    repository.registerTransfer.mockRejectedValue({ code: 'P2003' });

    await expect(useCase.execute(baseDto, 'u1')).rejects.toThrow(BadRequestException);
  });
});
