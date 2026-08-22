import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { RequestPrismaRepository } from '../infrastructure/request.prisma.repository';
import { RequestResponseDto } from '../dto/request-response.dto';
import { toRequestResponseDto } from './request-response.mapper';
import { withOptimisticLock } from '../../../common/utils/optimistic-lock.util';
import { ApprovalDecision } from '../domain/approval-quorum.util';
import {
  AlreadyVotedError,
  RequestAlreadyResolvedError,
  RequestNotFoundError,
  SelfApprovalError,
} from '../domain/request-approval.errors';
import { InsufficientStockError } from '../../../common/utils/inventory-ledger.util';
// HU-23, at the user's explicit request: same ADR-18 pattern, AuditModule.
import { RecordAuditEventUseCase } from '../../audit/application/use-cases/record-audit-event.use-case';

// Shared by ApproveRequestUseCase/RejectRequestUseCase — both are the same
// underlying write (RequestPrismaRepository.recordApprovalDecision, wrapped
// in withOptimisticLock for HU-17's concurrent-approvers race) with the
// same error translation, differing only in decision/whether a comment is
// mandatory (enforced by their DTOs, not here). Audited here too, once,
// instead of in each use-case separately.
export async function resolveApprovalDecision(
  requestRepository: RequestPrismaRepository,
  requestId: string,
  approverId: string,
  decision: ApprovalDecision,
  comment: string | undefined,
  recordAuditEvent: RecordAuditEventUseCase,
): Promise<RequestResponseDto> {
  try {
    const request = await withOptimisticLock(() =>
      requestRepository.recordApprovalDecision({ requestId, approverId, decision, comment }),
    );
    await recordAuditEvent.execute({
      userId: approverId,
      action: decision === 'approved' ? 'request.approve' : 'request.reject',
      entity: 'Request',
      entityId: requestId,
    });
    return toRequestResponseDto(request);
  } catch (error) {
    if (error instanceof RequestNotFoundError) {
      throw new NotFoundException(`Request ${requestId} not found`);
    }
    if (error instanceof SelfApprovalError) {
      throw new ForbiddenException('You cannot approve or reject your own request');
    }
    if (error instanceof AlreadyVotedError) {
      throw new ConflictException('You already voted on this request');
    }
    if (error instanceof RequestAlreadyResolvedError) {
      throw new ConflictException('This request was already resolved');
    }
    if (error instanceof InsufficientStockError) {
      throw new ConflictException('Insufficient stock to fulfil this consumption request');
    }
    throw error;
  }
}
