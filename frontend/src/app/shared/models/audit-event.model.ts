// HU-23 — mirrors backend/src/modules/audit/dto/audit-event-response.dto.ts.
export interface AuditEvent {
  id: string;
  userId: string | null;
  userLabel: string | null;
  action: string;
  entity: string;
  entityId: string;
  occurredAt: string;
}
