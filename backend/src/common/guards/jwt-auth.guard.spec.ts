import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

describe('JwtAuthGuard', () => {
  const context = {
    getHandler: jest.fn(),
    getClass: jest.fn(),
  } as unknown as ExecutionContext;

  it('allows the request through without checking the JWT when the endpoint is @Public()', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(true) } as unknown as Reflector;
    const guard = new JwtAuthGuard(reflector);
    const superCanActivate = jest.spyOn(AuthGuard('jwt').prototype, 'canActivate');

    const result = guard.canActivate(context);

    expect(result).toBe(true);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    expect(superCanActivate).not.toHaveBeenCalled();
    superCanActivate.mockRestore();
  });

  it('delegates to the JWT strategy when the endpoint is not @Public()', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    } as unknown as Reflector;
    const guard = new JwtAuthGuard(reflector);
    const superCanActivate = jest
      .spyOn(AuthGuard('jwt').prototype, 'canActivate')
      .mockReturnValue(false);

    const result = guard.canActivate(context);

    expect(result).toBe(false);
    expect(superCanActivate).toHaveBeenCalledWith(context);
    superCanActivate.mockRestore();
  });
});
