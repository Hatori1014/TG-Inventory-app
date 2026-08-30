export interface ErrorEventResponseDto {
  id: string;
  userId: string | null;
  userLabel: string | null;
  module: string | null;
  action: string | null;
  method: string;
  path: string;
  statusCode: number;
  message: string;
  occurredAt: Date;
}
