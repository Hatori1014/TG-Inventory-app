import { Module } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditController } from './audit.controller';
import { RecordAuditEventUseCase } from './application/use-cases/record-audit-event.use-case';
import { ListAuditEventsUseCase } from './application/use-cases/list-audit-events.use-case';
import { AuditEventPrismaRepository } from './infrastructure/audit-event.prisma.repository';

// HU-23 — RecordAuditEventUseCase is exported so AuthModule, RolesModule
// and RequestsModule can import this module and call it directly
// (legitimate cross-module DI, ADR-18 — same pattern HU-17 used for
// PurchasesModule/RequestsModule), at the user's explicit request instead
// of a cross-cutting interceptor.
@Module({
  controllers: [AuditController],
  providers: [PrismaService, RecordAuditEventUseCase, ListAuditEventsUseCase, AuditEventPrismaRepository],
  exports: [RecordAuditEventUseCase],
})
export class AuditModule {}
