import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { RequestPrismaRepository } from '../../infrastructure/request.prisma.repository';
import { UpdateRequestDto } from '../../dto/update-request.dto';
import { CreateRequestItemDto } from '../../dto/create-request-item.dto';
import { RequestResponseDto } from '../../dto/request-response.dto';
import { toRequestResponseDto } from '../request-response.mapper';

// HU-15 — PATCH /requests/:id. Only the requester who owns the draft can
// edit it, and only while it's still a draft — once submitted (pending or
// beyond), the request is immutable except through the approval flow
// itself (HU-17).
@Injectable()
export class UpdateRequestUseCase {
  constructor(private readonly requestRepository: RequestPrismaRepository) {}

  async execute(id: string, requesterId: string, dto: UpdateRequestDto): Promise<RequestResponseDto> {
    const existing = await this.requestRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Request ${id} not found`);
    }
    if (existing.requesterId !== requesterId) {
      throw new ForbiddenException('You can only edit your own requests');
    }
    if (existing.status !== 'draft') {
      throw new ConflictException('Only a draft request can be edited');
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

    if (dto.items) {
      for (const item of dto.items) {
        await this.validateItemReferences(item);
      }
    }

    const updated = await this.requestRepository.update(id, {
      supplierId: dto.supplierId,
      notes: dto.notes,
      items: dto.items?.map((item) => ({
        productId: item.productId,
        locationId: item.locationId,
        quantity: item.quantity,
        estimatedPrice: item.estimatedPrice,
      })),
    });
    return toRequestResponseDto(updated);
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
