import { AuditEventWithUser } from '../infrastructure/audit-event.prisma.repository';
import { AuditEventResponseDto } from '../dto/audit-event-response.dto';

export function toAuditEventResponseDto(event: AuditEventWithUser): AuditEventResponseDto {
  return {
    id: event.id,
    userId: event.userId,
    userLabel: event.user ? `${event.user.name} <${event.user.email}>` : null,
    action: event.action,
    entity: event.entity,
    entityId: event.entityId,
    occurredAt: event.occurredAt,
  };
}
