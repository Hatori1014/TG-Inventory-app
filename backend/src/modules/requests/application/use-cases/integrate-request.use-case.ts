import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { RequestPrismaRepository } from '../../infrastructure/request.prisma.repository';
import { RequestResponseDto } from '../../dto/request-response.dto';
import { IntegrateRequestDto } from '../../dto/integrate-request.dto';
import { toRequestResponseDto } from '../request-response.mapper';
// HU-17, at the user's explicit request: reuse RegisterPurchaseUseCase from
// HU-13 rather than duplicating it — legitimate cross-module DI, exported
// by PurchasesModule (ADR-18 boundaries only forbid importing another
// module's domain/infrastructure directly, not its exported use-cases).
import { RegisterPurchaseUseCase } from '../../../purchases/application/use-cases/register-purchase.use-case';
import { CreatePurchaseDto } from '../../../purchases/dto/create-purchase.dto';

// HU-17 — PATCH /requests/:id/integrate, the last step of the purchase
// cycle: the inventory admin (requests:integrate, a different permission
// than requests:approve — the user's explicit design, "el pendiente de
// integrar al inventario pasaría a manejarlo el admin de inventarios")
// turns an approved request into a real Purchase. Supplier + product +
// location + quantity are already on the request (captured at creation,
// DoR resolved by the user); only receiving-time detail (batch/lot number,
// final unit price) is supplied here.
@Injectable()
export class IntegrateRequestUseCase {
  constructor(
    private readonly requestRepository: RequestPrismaRepository,
    private readonly registerPurchaseUseCase: RegisterPurchaseUseCase,
  ) {}

  async execute(requestId: string, userId: string, dto: IntegrateRequestDto): Promise<RequestResponseDto> {
    const request = await this.requestRepository.findById(requestId);
    if (!request) {
      throw new NotFoundException(`Request ${requestId} not found`);
    }
    if (request.type !== 'purchase') {
      throw new BadRequestException('Only purchase requests can be integrated into inventory');
    }
    if (request.status !== 'pending_inventory_integration' || request.purchaseId) {
      throw new ConflictException('This request is not awaiting inventory integration');
    }
    if (!request.supplierId) {
      throw new BadRequestException('Request has no supplier — it should never have reached approval without one');
    }

    const suppliedByItemId = new Map(dto.items.map((item) => [item.requestItemId, item]));
    if (suppliedByItemId.size !== request.items.length || request.items.some((item) => !suppliedByItemId.has(item.id))) {
      throw new BadRequestException('Must supply receiving details for exactly the items on this request');
    }

    const createPurchaseDto: CreatePurchaseDto = {
      supplierId: request.supplierId,
      items: request.items.map((item) => {
        const supplied = suppliedByItemId.get(item.id)!;
        return {
          productId: item.productId,
          locationId: item.locationId,
          quantity: Number(item.quantity),
          unitPrice: supplied.unitPrice,
          batchNumber: supplied.batchNumber,
          batchExpiresAt: supplied.batchExpiresAt,
        };
      }),
    };

    const purchase = await this.registerPurchaseUseCase.execute(createPurchaseDto, userId, requestId);
    const closed = await this.requestRepository.closeAfterIntegration(requestId, purchase.id);
    return toRequestResponseDto(closed);
  }
}
