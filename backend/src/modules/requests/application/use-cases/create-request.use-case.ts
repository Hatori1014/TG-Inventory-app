import { BadRequestException, Injectable } from '@nestjs/common';
import { RequestPrismaRepository } from '../../infrastructure/request.prisma.repository';
import { CreateRequestDto } from '../../dto/create-request.dto';
import { CreateRequestItemDto } from '../../dto/create-request-item.dto';
import { RequestResponseDto } from '../../dto/request-response.dto';
import { toRequestResponseDto } from '../request-response.mapper';
import { RequestItemInput } from '../../domain/request-item-input.value-object';
import { PurchaseRequestSubmission } from '../../domain/purchase-request-submission.entity';
import { findInsufficientStockItems } from '../../domain/consumption-stock-check.util';

// HU-15/16 — "Crear solicitud (tipo compra o consumo)" (plan section 7.4:
// POST /requests), one endpoint for both types (CreateRequestDto's
// @IsIn(['purchase', 'consumption'])) — HU-15 enabled only 'purchase'
// first, same pattern as HU-07 enabling only MovementType 'in'.
@Injectable()
export class CreateRequestUseCase {
  constructor(private readonly requestRepository: RequestPrismaRepository) {}

  async execute(requesterId: string, dto: CreateRequestDto): Promise<RequestResponseDto> {
    const items = dto.items ?? [];

    for (const item of items) {
      await this.validateItemReferences(item);
    }

    if (dto.type === 'consumption') {
      return this.createConsumptionRequest(requesterId, dto, items);
    }
    return this.createPurchaseRequest(requesterId, dto, items);
  }

  // HU-16 — no draft concept at all (its own criteria never mentions one,
  // and the consumption RequestStatus cycle — pending -> approved/rejected
  // -> closed, DoR resolved with the user — has no draft state to land
  // in), no supplier (that's purchase-only), and the one rule the user's
  // own criterion calls out explicitly: "no se puede solicitar más
  // cantidad de la que hay en stock en esa ubicación" — validated in the
  // backend, not just the UI, against real LocationStock totals summed
  // across every batch.
  private async createConsumptionRequest(
    requesterId: string,
    dto: CreateRequestDto,
    items: CreateRequestItemDto[],
  ): Promise<RequestResponseDto> {
    if (dto.saveAsDraft) {
      throw new BadRequestException('Consumption requests cannot be saved as drafts');
    }
    if (dto.supplierId) {
      throw new BadRequestException('supplierId is not applicable to consumption requests');
    }
    if (items.length === 0) {
      throw new BadRequestException('A consumption request needs at least one item');
    }

    const availabilityChecks = await Promise.all(
      items.map(async (item) => ({
        productId: item.productId,
        locationId: item.locationId,
        requestedQuantity: item.quantity,
        availableQuantity: await this.requestRepository.findAvailableStock(item.productId, item.locationId),
      })),
    );
    const insufficient = findInsufficientStockItems(availabilityChecks);
    if (insufficient.length > 0) {
      const details = insufficient
        .map(
          (i) =>
            `productId ${i.productId} at locationId ${i.locationId} (requested ${i.requestedQuantity}, available ${i.availableQuantity})`,
        )
        .join('; ');
      throw new BadRequestException(`Insufficient stock: ${details}`);
    }

    const request = await this.requestRepository.create({
      type: 'consumption',
      requesterId,
      status: 'pending',
      notes: dto.notes,
      items: items.map((item) => ({
        productId: item.productId,
        locationId: item.locationId,
        quantity: item.quantity,
      })),
    });
    return toRequestResponseDto(request);
  }

  // HU-15 — saveAsDraft skips the "supplier + at least one item" rule
  // (PurchaseRequestSubmission.canSubmit(), DoR resolved with the user)
  // but the items that ARE present still have to reference real
  // products/active locations — a draft can be incomplete, never invalid.
  private async createPurchaseRequest(
    requesterId: string,
    dto: CreateRequestDto,
    items: CreateRequestItemDto[],
  ): Promise<RequestResponseDto> {
    if (dto.saveAsDraft) {
      const request = await this.requestRepository.create({
        type: 'purchase',
        requesterId,
        supplierId: dto.supplierId,
        status: 'draft',
        notes: dto.notes,
        items: items.map((item) => ({
          productId: item.productId,
          locationId: item.locationId,
          quantity: item.quantity,
          estimatedPrice: item.estimatedPrice,
        })),
      });
      return toRequestResponseDto(request);
    }

    if (dto.supplierId) {
      const supplierStatus = await this.requestRepository.findSupplierStatus(dto.supplierId);
      if (!supplierStatus) {
        throw new BadRequestException('supplierId does not exist');
      }
      if (supplierStatus === 'inactive') {
        throw new BadRequestException('supplierId refers to an inactive supplier');
      }
    }

    // Re-validates quantity (already checked by CreateRequestItemDto) and
    // runs the real submission rule — not dead code, this is where
    // PurchaseRequestSubmission actually decides.
    const itemInputs = items.map(
      (item) => new RequestItemInput(item.productId, item.locationId, item.quantity, item.estimatedPrice),
    );
    const submission = new PurchaseRequestSubmission(dto.supplierId ?? null, itemInputs);
    if (!submission.canSubmit()) {
      throw new BadRequestException('A purchase request needs a supplier and at least one item to be submitted');
    }

    const request = await this.requestRepository.create({
      type: 'purchase',
      requesterId,
      supplierId: dto.supplierId,
      status: 'pending',
      notes: dto.notes,
      items: items.map((item) => ({
        productId: item.productId,
        locationId: item.locationId,
        quantity: item.quantity,
        estimatedPrice: item.estimatedPrice,
      })),
    });
    return toRequestResponseDto(request);
  }

  private async validateItemReferences(item: CreateRequestItemDto): Promise<void> {
    const productName = await this.requestRepository.findProductName(item.productId);
    if (!productName) {
      throw new BadRequestException(`productId ${item.productId} does not exist`);
    }

    const locationStatus = await this.requestRepository.findLocationStatus(item.locationId);
    if (!locationStatus) {
      throw new BadRequestException(`locationId ${item.locationId} does not exist`);
    }
    if (locationStatus === 'inactive') {
      throw new BadRequestException(`locationId ${item.locationId} refers to an inactive location`);
    }
  }
}
