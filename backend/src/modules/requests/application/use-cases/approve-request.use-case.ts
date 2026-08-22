import { Injectable } from '@nestjs/common';
import { RequestPrismaRepository } from '../../infrastructure/request.prisma.repository';
import { RequestResponseDto } from '../../dto/request-response.dto';
import { resolveApprovalDecision } from '../resolve-approval-decision.helper';

// HU-17 — PATCH /requests/:id/approve. Parallel multi-approval, at the
// user's explicit request: this call only ever casts ONE vote; whether the
// request actually moves forward (quorum reached) is decided inside
// RequestPrismaRepository.recordApprovalDecision, atomically with the
// vote, since two approvers can race to be the one who completes it.
@Injectable()
export class ApproveRequestUseCase {
  constructor(private readonly requestRepository: RequestPrismaRepository) {}

  execute(requestId: string, approverId: string, comment: string | undefined): Promise<RequestResponseDto> {
    return resolveApprovalDecision(this.requestRepository, requestId, approverId, 'approved', comment);
  }
}
