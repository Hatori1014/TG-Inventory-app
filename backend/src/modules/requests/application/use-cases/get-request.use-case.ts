import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { RequestPrismaRepository } from '../../infrastructure/request.prisma.repository';
import { RequestResponseDto } from '../../dto/request-response.dto';
import { toRequestResponseDto } from '../request-response.mapper';

// HU-15 — GET /requests/:id. Ownership-only for now (HU-17 will extend
// this so an approver can view a request that's waiting on them).
@Injectable()
export class GetRequestUseCase {
  constructor(private readonly requestRepository: RequestPrismaRepository) {}

  async execute(id: string, requesterId: string): Promise<RequestResponseDto> {
    const request = await this.requestRepository.findById(id);
    if (!request) {
      throw new NotFoundException(`Request ${id} not found`);
    }
    if (request.requesterId !== requesterId) {
      throw new ForbiddenException('You can only view your own requests');
    }
    return toRequestResponseDto(request);
  }
}
