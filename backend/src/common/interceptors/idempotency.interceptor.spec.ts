import { BadRequestException, CallHandler, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of } from 'rxjs';
import { IdempotencyInterceptor } from './idempotency.interceptor';

describe('IdempotencyInterceptor', () => {
  const buildContext = (headers: Record<string, string> = {}): ExecutionContext =>
    ({
      getHandler: () => jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ headers, url: '/purchases' }),
      }),
    }) as unknown as ExecutionContext;

  const buildNext = (response: unknown = { ok: true }): CallHandler => ({
    handle: jest.fn().mockReturnValue(of(response)),
  });

  let reflector: Reflector;
  let prisma: {
    idempotencyKey: {
      findUnique: jest.Mock;
      create: jest.Mock;
    };
  };
  let interceptor: IdempotencyInterceptor;

  beforeEach(() => {
    reflector = new Reflector();
    prisma = {
      idempotencyKey: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };
    interceptor = new IdempotencyInterceptor(reflector, prisma as never);
  });

  it('skips idempotency handling entirely when the handler is not @Idempotent()', async () => {
    jest.spyOn(reflector, 'get').mockReturnValue(undefined);
    const next = buildNext();

    const result$ = await interceptor.intercept(buildContext(), next);
    await result$.toPromise();

    expect(next.handle).toHaveBeenCalledTimes(1);
    expect(prisma.idempotencyKey.findUnique).not.toHaveBeenCalled();
  });

  it('rejects a marked endpoint when the Idempotency-Key header is missing', async () => {
    jest.spyOn(reflector, 'get').mockReturnValue(true);
    const next = buildNext();

    await expect(interceptor.intercept(buildContext(), next)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(next.handle).not.toHaveBeenCalled();
  });

  it('executes the handler and stores the response on the first call for a key', async () => {
    jest.spyOn(reflector, 'get').mockReturnValue(true);
    prisma.idempotencyKey.findUnique.mockResolvedValue(null);
    prisma.idempotencyKey.create.mockResolvedValue({});
    const next = buildNext({ id: 'purchase-1' });

    const result$ = await interceptor.intercept(
      buildContext({ 'idempotency-key': 'key-1' }),
      next,
    );
    const result = await result$.toPromise();

    expect(next.handle).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ id: 'purchase-1' });
    expect(prisma.idempotencyKey.create).toHaveBeenCalledWith({
      data: { key: 'key-1', endpoint: '/purchases', response: { id: 'purchase-1' } },
    });
  });

  it('returns the stored response without re-executing the handler on a repeat key', async () => {
    jest.spyOn(reflector, 'get').mockReturnValue(true);
    prisma.idempotencyKey.findUnique.mockResolvedValue({ response: { id: 'purchase-1' } });
    const next = buildNext({ id: 'should-not-be-used' });

    const result$ = await interceptor.intercept(
      buildContext({ 'idempotency-key': 'key-1' }),
      next,
    );
    const result = await result$.toPromise();

    expect(next.handle).not.toHaveBeenCalled();
    expect(result).toEqual({ id: 'purchase-1' });
  });

  it('returns the winning response when two concurrent requests race on the same key', async () => {
    jest.spyOn(reflector, 'get').mockReturnValue(true);
    prisma.idempotencyKey.findUnique
      .mockResolvedValueOnce(null) // this request's initial check finds nothing
      .mockResolvedValueOnce({ response: { id: 'purchase-1' } }); // the winner's row, re-read after the race
    prisma.idempotencyKey.create.mockRejectedValue({ code: 'P2002' });
    const next = buildNext({ id: 'this-requests-own-result' });

    const result$ = await interceptor.intercept(
      buildContext({ 'idempotency-key': 'key-1' }),
      next,
    );
    const result = await result$.toPromise();

    expect(result).toEqual({ id: 'purchase-1' });
  });
});
