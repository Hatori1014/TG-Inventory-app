import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { RequestPrismaRepository } from '../../infrastructure/request.prisma.repository';
import { RequestResponseDto } from '../../dto/request-response.dto';
import { toRequestResponseDto } from '../request-response.mapper';
import { RequestItemInput } from '../../domain/request-item-input.value-object';
import { PurchaseRequestSubmission } from '../../domain/purchase-request-submission.entity';

// HU-15 — PATCH /requests/:id/submit: draft -> pending. Separate from
// UpdateRequestUseCase because it's a state transition, not a field edit —
// same reasoning as HU-11's separate create/update endpoints.
@Injectable()
export class SubmitRequestUseCase {
  constructor(private readonly requestRepository: RequestPrismaRepository) {}

  async execute(id: string, requesterId: string): Promise<RequestResponseDto> {
    const existing = await this.requestRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Request ${id} not found`);
    }
    if (existing.requesterId !== requesterId) {
      throw new ForbiddenException('You can only submit your own requests');
    }
    if (existing.status !== 'draft') {
      throw new ConflictException('Only a draft request can be submitted');
    }

    const itemInputs = existing.items.map(
      (item) =>
        new RequestItemInput(
          item.productId,
          item.locationId,
          Number(item.quantity),
          item.estimatedPrice !== null ? Number(item.estimatedPrice) : undefined,
        ),
    );
    const submission = new PurchaseRequestSubmission(existing.supplierId, itemInputs);
    if (!submission.canSubmit()) {
      throw new BadRequestException('A purchase request needs a supplier and at least one item to be submitted');
    }

    const updated = await this.requestRepository.updateStatus(id, 'pending');
    return toRequestResponseDto(updated);
  }
}
