import { BadRequestException, Injectable } from '@nestjs/common';
import { RequestPrismaRepository } from '../../infrastructure/request.prisma.repository';
import { CreateRequestDto } from '../../dto/create-request.dto';
import { CreateRequestItemDto } from '../../dto/create-request-item.dto';
import { RequestResponseDto } from '../../dto/request-response.dto';
import { toRequestResponseDto } from '../request-response.mapper';
import { RequestItemInput } from '../../domain/request-item-input.value-object';
import { PurchaseRequestSubmission } from '../../domain/purchase-request-submission.entity';

// HU-15 — "Solicitud de compra a proveedor" (plan section 7.4: POST
// /requests). Only type='purchase' is enabled (CreateRequestDto's
// @IsIn(['purchase'])) — same pattern as HU-07 enabling only MovementType
// 'in' first; HU-16 loosens this for 'consumption'. saveAsDraft skips the
// "supplier + at least one item" rule (PurchaseRequestSubmission.canSubmit(),
// DoR resolved with the user) but still validates that whatever items ARE
// present reference real products/active locations — a draft can be
// incomplete, never invalid.
@Injectable()
export class CreateRequestUseCase {
  constructor(private readonly requestRepository: RequestPrismaRepository) {}

  async execute(requesterId: string, dto: CreateRequestDto): Promise<RequestResponseDto> {
    const items = dto.items ?? [];

    for (const item of items) {
      await this.validateItemReferences(item);
    }

    if (dto.saveAsDraft) {
      const request = await this.requestRepository.create({
        type: dto.type,
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
      type: dto.type,
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
