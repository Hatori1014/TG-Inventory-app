export interface AuditEventResponseDto {
  id: string;
  userId: string | null;
  // "Name <email>", or null when userId is null (failed login against an
  // unknown email — see RecordAuditEventUseCase).
  userLabel: string | null;
  action: string;
  entity: string;
  entityId: string;
  occurredAt: Date;
}
