import { Module } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditController } from './audit.controller';
import { ErrorEventsController } from './error-events.controller';
import { RecordAuditEventUseCase } from './application/use-cases/record-audit-event.use-case';
import { ListAuditEventsUseCase } from './application/use-cases/list-audit-events.use-case';
import { RecordErrorEventUseCase } from './application/use-cases/record-error-event.use-case';
import { ListErrorEventsUseCase } from './application/use-cases/list-error-events.use-case';
import { AuditEventPrismaRepository } from './infrastructure/audit-event.prisma.repository';
import { ErrorEventPrismaRepository } from './infrastructure/error-event.prisma.repository';

// HU-23 — RecordAuditEventUseCase is exported so AuthModule, RolesModule
// and RequestsModule can import this module and call it directly
// (legitimate cross-module DI, ADR-18 — same pattern HU-17 used for
// PurchasesModule/RequestsModule), at the user's explicit request instead
// of a cross-cutting interceptor.
// HU-31 — RecordErrorEventUseCase is exported the same way, for
// GlobalExceptionFilter (provided at the AppModule root, which imports
// this module) to call directly.
@Module({
  controllers: [AuditController, ErrorEventsController],
  providers: [
    PrismaService,
    RecordAuditEventUseCase,
    ListAuditEventsUseCase,
    AuditEventPrismaRepository,
    RecordErrorEventUseCase,
    ListErrorEventsUseCase,
    ErrorEventPrismaRepository,
  ],
  exports: [RecordAuditEventUseCase, RecordErrorEventUseCase],
})
export class AuditModule {}
