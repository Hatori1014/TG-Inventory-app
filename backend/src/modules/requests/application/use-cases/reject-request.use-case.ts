import { Injectable } from '@nestjs/common';
import { RequestPrismaRepository } from '../../infrastructure/request.prisma.repository';
import { RequestResponseDto } from '../../dto/request-response.dto';
import { resolveApprovalDecision } from '../resolve-approval-decision.helper';

// HU-17 — PATCH /requests/:id/reject. A single rejection, from any one of
// the possible approvers, closes the request immediately regardless of how
// many approvals were already cast ("si existe un rechazo se cierra la
// solicitud") — RejectRequestDto makes the comment mandatory, the user's
// explicit requirement so the requester always sees why.
@Injectable()
export class RejectRequestUseCase {
  constructor(private readonly requestRepository: RequestPrismaRepository) {}

  execute(requestId: string, approverId: string, comment: string): Promise<RequestResponseDto> {
    return resolveApprovalDecision(this.requestRepository, requestId, approverId, 'rejected', comment);
  }
}
