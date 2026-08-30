import { ArgumentsHost, BadRequestException, NotFoundException } from '@nestjs/common';
import { GlobalExceptionFilter } from './global-exception.filter';
import { RecordErrorEventUseCase } from '../../modules/audit/application/use-cases/record-error-event.use-case';

function buildHost(overrides?: {
  method?: string;
  url?: string;
  user?: { id: string };
  requiredPermission?: { module: string; action: string };
}) {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const response = { status };
  const request = {
    method: overrides?.method ?? 'GET',
    url: overrides?.url ?? '/test',
    user: overrides?.user,
    requiredPermission: overrides?.requiredPermission,
  };

  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request,
    }),
  } as unknown as ArgumentsHost;

  return { host, status, json };
}

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let recordErrorEvent: jest.Mocked<RecordErrorEventUseCase>;

  beforeEach(() => {
    recordErrorEvent = { execute: jest.fn().mockResolvedValue(undefined) } as unknown as jest.Mocked<RecordErrorEventUseCase>;
    filter = new GlobalExceptionFilter(recordErrorEvent);
  });

  it('preserves status and message for a known HttpException', () => {
    const { host, status, json } = buildHost({ url: '/suppliers/1' });

    filter.catch(new NotFoundException('Supplier not found'), host);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        message: 'Supplier not found',
        path: '/suppliers/1',
      }),
    );
  });

  it('preserves the validation message array from a BadRequestException', () => {
    const { host, status, json } = buildHost();

    filter.catch(new BadRequestException(['name should not be empty']), host);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ message: ['name should not be empty'] }),
    );
  });

  it('maps an unknown error to a generic 500 without leaking its message', () => {
    const { host, status, json } = buildHost();

    filter.catch(new Error('a Prisma connection string with a secret in it'), host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 500, message: 'Internal server error' }),
    );
    const [payload] = json.mock.calls[0];
    expect(payload.message).not.toContain('secret');
  });

  // HU-31
  it('records the error with the module/action PermissionsGuard already stashed on the request', () => {
    const { host } = buildHost({
      method: 'DELETE',
      url: '/roles/role-1',
      user: { id: 'user-1' },
      requiredPermission: { module: 'roles', action: 'delete' },
    });

    filter.catch(new NotFoundException('Role not found'), host);

    expect(recordErrorEvent.execute).toHaveBeenCalledWith({
      userId: 'user-1',
      module: 'roles',
      action: 'delete',
      method: 'DELETE',
      path: '/roles/role-1',
      statusCode: 404,
      message: 'Role not found',
    });
  });

  it('records null module/action/userId for a route with no permission metadata or caller', () => {
    const { host } = buildHost({ method: 'POST', url: '/auth/login' });

    filter.catch(new BadRequestException('Usuario o contraseña incorrectos'), host);

    expect(recordErrorEvent.execute).toHaveBeenCalledWith(
      expect.objectContaining({ userId: null, module: null, action: null }),
    );
  });

  it('joins a validation message array into a single string for the recorded event', () => {
    const { host } = buildHost();

    filter.catch(new BadRequestException(['name should not be empty', 'unitId must be a UUID']), host);

    expect(recordErrorEvent.execute).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'name should not be empty; unitId must be a UUID' }),
    );
  });

  it('never lets a recording failure affect the error response already sent', () => {
    recordErrorEvent.execute.mockRejectedValue(new Error('DB unreachable'));
    const { host, status, json } = buildHost();

    expect(() => filter.catch(new NotFoundException('Supplier not found'), host)).not.toThrow();
    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalled();
  });

  // Regression test for a real crash found via manual verification against
  // the compiled server: the filter used to try reading route metadata
  // itself via `(host as ExecutionContext).getHandler()`, which returned
  // undefined on real request paths despite working in isolated unit
  // tests — and Reflect.getMetadata (inside Reflector.get) throws
  // synchronously, not via a rejected promise, on an undefined target.
  // That exception escaped catch() entirely and crashed the whole Node
  // process on the very next real error. Fixed by having PermissionsGuard
  // (which does have a real ExecutionContext) stash the permission on the
  // request instead — this test just confirms recording itself can never
  // take the filter down, whatever throws inside it.
  it('never crashes even if recording the error itself throws synchronously', () => {
    recordErrorEvent.execute.mockImplementation(() => {
      throw new TypeError('boom');
    });
    const { host, status, json } = buildHost();

    expect(() => filter.catch(new NotFoundException('Supplier not found'), host)).not.toThrow();
    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalled();
  });
});
