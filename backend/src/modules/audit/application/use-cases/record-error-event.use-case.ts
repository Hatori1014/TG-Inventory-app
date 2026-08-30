import { Injectable, Logger } from '@nestjs/common';
import { ErrorEventPrismaRepository } from '../../infrastructure/error-event.prisma.repository';

export interface RecordErrorEventInput {
  userId: string | null;
  module: string | null;
  action: string | null;
  method: string;
  path: string;
  statusCode: number;
  message: string;
}

// HU-31 — exported so GlobalExceptionFilter (TT-15, provided at the
// AppModule root, which already imports AuditModule) can call it
// directly, same ADR-18 cross-module DI pattern as RecordAuditEventUseCase.
// Never lets a logging failure affect the error response already being
// sent — same reasoning as RecordAuditEventUseCase.
@Injectable()
export class RecordErrorEventUseCase {
  private readonly logger = new Logger(RecordErrorEventUseCase.name);

  constructor(private readonly errorEventRepository: ErrorEventPrismaRepository) {}

  async execute(input: RecordErrorEventInput): Promise<void> {
    try {
      await this.errorEventRepository.create(input);
    } catch (error) {
      this.logger.error(
        `Failed to record error event for ${input.method} ${input.path}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
