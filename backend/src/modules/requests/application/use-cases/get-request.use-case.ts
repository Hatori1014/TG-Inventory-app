import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { RequestPrismaRepository } from '../../infrastructure/request.prisma.repository';
import { RequestResponseDto } from '../../dto/request-response.dto';
import { toRequestResponseDto } from '../request-response.mapper';

// HU-15/17 — GET /requests/:id. Ownership always allows viewing; beyond
// that, HU-17 broadens it to whoever can currently act on the request —
// an approver while it's pending/in_review, or the inventory admin while
// it's pending_inventory_integration — checked via permission (not role
// name), same convention as everywhere else in this codebase.
@Injectable()
export class GetRequestUseCase {
  constructor(private readonly requestRepository: RequestPrismaRepository) {}

  async execute(id: string, userId: string): Promise<RequestResponseDto> {
    const request = await this.requestRepository.findById(id);
    if (!request) {
      throw new NotFoundException(`Request ${id} not found`);
    }
    if (request.requesterId === userId) {
      return toRequestResponseDto(request);
    }

    if (request.status === 'pending' || request.status === 'in_review') {
      if (await this.requestRepository.userHasPermission(userId, 'requests', 'approve')) {
        return toRequestResponseDto(request);
      }
    }
    if (request.status === 'pending_inventory_integration') {
      if (await this.requestRepository.userHasPermission(userId, 'requests', 'integrate')) {
        return toRequestResponseDto(request);
      }
    }

    throw new ForbiddenException('You can only view your own requests, or ones awaiting your action');
  }
}
