import { Injectable, Logger } from '@nestjs/common';
import { AuditEventPrismaRepository } from '../../infrastructure/audit-event.prisma.repository';

export interface RecordAuditEventInput {
  // Null only for a failed login against an email that matches no user —
  // every other sensitive action always has a real actor.
  userId: string | null;
  action: string;
  entity: string;
  entityId: string;
}

// HU-23 — exported so AuthModule/RolesModule/RequestsModule call it
// directly (ADR-18 cross-module DI), at the user's explicit request,
// instead of a cross-cutting interceptor: the caller decides exactly what
// to record, and a sensitive action that forgot to call this is visible as
// a missing call at the use-case, not hidden inside decorator wiring.
//
// Never lets a logging failure break the action being audited — losing an
// audit row is bad, but failing a login/approval/role-change because the
// audit write failed would be worse.
@Injectable()
export class RecordAuditEventUseCase {
  private readonly logger = new Logger(RecordAuditEventUseCase.name);

  constructor(private readonly auditEventRepository: AuditEventPrismaRepository) {}

  async execute(input: RecordAuditEventInput): Promise<void> {
    try {
      await this.auditEventRepository.create(input);
    } catch (error) {
      this.logger.error(
        `Failed to record audit event "${input.action}" on ${input.entity}:${input.entityId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
