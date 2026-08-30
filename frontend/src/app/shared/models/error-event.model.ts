// HU-31 — mirrors backend/src/modules/audit/dto/error-event-response.dto.ts.
export interface ErrorEvent {
  id: string;
  userId: string | null;
  userLabel: string | null;
  module: string | null;
  action: string | null;
  method: string;
  path: string;
  statusCode: number;
  message: string;
  occurredAt: string;
}
