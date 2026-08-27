import { ErrorEventWithUser } from '../infrastructure/error-event.prisma.repository';
import { ErrorEventResponseDto } from '../dto/error-event-response.dto';

export function toErrorEventResponseDto(event: ErrorEventWithUser): ErrorEventResponseDto {
  return {
    id: event.id,
    userId: event.userId,
    userLabel: event.user ? `${event.user.name} <${event.user.email}>` : null,
    module: event.module,
    action: event.action,
    method: event.method,
    path: event.path,
    statusCode: event.statusCode,
    message: event.message,
    occurredAt: event.occurredAt,
  };
}
