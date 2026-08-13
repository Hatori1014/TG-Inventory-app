import { ArgumentsHost, BadRequestException, NotFoundException } from '@nestjs/common';
import { GlobalExceptionFilter } from './global-exception.filter';

function buildHost(overrides?: { method?: string; url?: string }) {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const response = { status };
  const request = { method: overrides?.method ?? 'GET', url: overrides?.url ?? '/test' };

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

  beforeEach(() => {
    filter = new GlobalExceptionFilter();
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
});
