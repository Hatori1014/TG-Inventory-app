import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { IntegrateRequestUseCase } from './integrate-request.use-case';
import { RequestPrismaRepository } from '../../infrastructure/request.prisma.repository';
import { RegisterPurchaseUseCase } from '../../../purchases/application/use-cases/register-purchase.use-case';

describe('IntegrateRequestUseCase', () => {
  let useCase: IntegrateRequestUseCase;
  let requestRepository: jest.Mocked<RequestPrismaRepository>;
  let registerPurchaseUseCase: jest.Mocked<RegisterPurchaseUseCase>;

  const pendingIntegrationRequest = {
    id: 'request-1',
    type: 'purchase',
    status: 'pending_inventory_integration',
    requesterId: 'user-1',
    requester: { id: 'user-1', name: 'Ana' },
    supplierId: 'supplier-1',
    supplier: { id: 'supplier-1', name: 'Acme' },
    purchaseId: null,
    createdAt: new Date(),
    resolvedAt: new Date(),
    notes: null,
    items: [
      {
        id: 'item-1',
        productId: 'product-1',
        product: { id: 'product-1', name: 'Arroz' },
        locationId: 'location-1',
        location: { id: 'location-1', name: 'Bodega A' },
        quantity: 5,
        estimatedPrice: 1000,
      },
    ],
    approvals: [],
  };

  const closedRequest = { ...pendingIntegrationRequest, status: 'closed', purchaseId: 'purchase-1' };

  beforeEach(() => {
    requestRepository = {
      findById: jest.fn(),
      closeAfterIntegration: jest.fn(),
    } as unknown as jest.Mocked<RequestPrismaRepository>;
    registerPurchaseUseCase = { execute: jest.fn() } as unknown as jest.Mocked<RegisterPurchaseUseCase>;
    useCase = new IntegrateRequestUseCase(requestRepository, registerPurchaseUseCase);
  });

  it('throws NotFoundException when the request does not exist', async () => {
    requestRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute('missing', 'admin-1', { items: [{ requestItemId: 'item-1', unitPrice: 1200 }] }),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws BadRequestException for a consumption request', async () => {
    requestRepository.findById.mockResolvedValue({ ...pendingIntegrationRequest, type: 'consumption' } as never);

    await expect(
      useCase.execute('request-1', 'admin-1', { items: [{ requestItemId: 'item-1', unitPrice: 1200 }] }),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws ConflictException when the request is not pending_inventory_integration', async () => {
    requestRepository.findById.mockResolvedValue({ ...pendingIntegrationRequest, status: 'pending' } as never);

    await expect(
      useCase.execute('request-1', 'admin-1', { items: [{ requestItemId: 'item-1', unitPrice: 1200 }] }),
    ).rejects.toThrow(ConflictException);
  });

  it('throws ConflictException when the request was already integrated', async () => {
    requestRepository.findById.mockResolvedValue({
      ...pendingIntegrationRequest,
      purchaseId: 'purchase-already',
    } as never);

    await expect(
      useCase.execute('request-1', 'admin-1', { items: [{ requestItemId: 'item-1', unitPrice: 1200 }] }),
    ).rejects.toThrow(ConflictException);
  });

  it('throws BadRequestException when the supplied items do not match the request items', async () => {
    requestRepository.findById.mockResolvedValue(pendingIntegrationRequest as never);

    await expect(
      useCase.execute('request-1', 'admin-1', { items: [{ requestItemId: 'unknown-item', unitPrice: 1200 }] }),
    ).rejects.toThrow(BadRequestException);
  });

  it('registers the purchase from the request data and closes the request', async () => {
    requestRepository.findById.mockResolvedValue(pendingIntegrationRequest as never);
    registerPurchaseUseCase.execute.mockResolvedValue({ id: 'purchase-1' } as never);
    requestRepository.closeAfterIntegration.mockResolvedValue(closedRequest as never);

    const result = await useCase.execute('request-1', 'admin-1', {
      items: [{ requestItemId: 'item-1', unitPrice: 1200, batchNumber: 'LOT-1' }],
    });

    expect(registerPurchaseUseCase.execute).toHaveBeenCalledWith(
      {
        supplierId: 'supplier-1',
        items: [
          { productId: 'product-1', locationId: 'location-1', quantity: 5, unitPrice: 1200, batchNumber: 'LOT-1', batchExpiresAt: undefined },
        ],
      },
      'admin-1',
      'request-1',
    );
    expect(requestRepository.closeAfterIntegration).toHaveBeenCalledWith('request-1', 'purchase-1');
    expect(result.status).toBe('closed');
    expect(result.purchaseId).toBe('purchase-1');
  });
});
