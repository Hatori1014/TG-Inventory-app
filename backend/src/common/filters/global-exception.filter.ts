import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { RequiredPermission } from '../decorators/require-permission.decorator';
import { AuthenticatedRequestUser } from '../decorators/current-user.decorator';
import { RecordErrorEventUseCase } from '../../modules/audit/application/use-cases/record-error-event.use-case';

interface RequestWithContext extends Request {
  user?: AuthenticatedRequestUser;
  // Set by PermissionsGuard (ADR-25), which already resolves this via a
  // real ExecutionContext to decide access — see the comment there for
  // why this filter reads it back instead of trying to re-derive it.
  requiredPermission?: RequiredPermission;
}

// TT-15 — last line of defense: an uncaught error in one module must not
// take down the shared Node process, and every error response (known or
// not) gets a consistent shape instead of leaking a raw stack trace.
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  constructor(private readonly recordErrorEvent: RecordErrorEventUseCase) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithContext>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse = isHttpException ? exception.getResponse() : null;

    const message = isHttpException
      ? typeof exceptionResponse === 'string'
        ? exceptionResponse
        : ((exceptionResponse as { message?: string | string[] })?.message ?? exception.message)
      : 'Internal server error';

    if (!isHttpException) {
      // unknown errors are never safe to show the client — log the real one server-side
      const error = exception instanceof Error ? exception.stack : exception;
      this.logger.error(`Unhandled exception on ${request.method} ${request.url}`, error);
    } else if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(`${request.method} ${request.url} -> ${status}`, exception.stack);
    }

    // HU-31, at the user's explicit request: every error response (4xx and
    // 5xx alike) is recorded, filterable later by module/action. Wrapped
    // so nothing here can ever throw synchronously and pre-empt the
    // response being sent — this filter is the app's actual last line of
    // defense (TT-15), an exception escaping it has nowhere left to go
    // and takes the whole process down with it.
    const rawMessage = Array.isArray(message) ? message.join('; ') : String(message);
    this.recordErrorEventSafely(request, status, rawMessage);

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private recordErrorEventSafely(request: RequestWithContext, status: number, message: string): void {
    try {
      this.recordErrorEvent
        .execute({
          userId: request.user?.id ?? null,
          module: request.requiredPermission?.module ?? null,
          action: request.requiredPermission?.action ?? null,
          method: request.method,
          path: request.url,
          statusCode: status,
          message,
        })
        // Defense in depth on top of RecordErrorEventUseCase's own swallow.
        .catch(() => {});
    } catch (error) {
      this.logger.error('Failed to record error event', error instanceof Error ? error.stack : String(error));
    }
  }
}
