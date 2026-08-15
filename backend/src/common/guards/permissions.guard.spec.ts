import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { REQUIRE_PERMISSION_KEY } from '../decorators/require-permission.decorator';

describe('PermissionsGuard', () => {
  function buildContext(user: unknown): ExecutionContext {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    } as unknown as ExecutionContext;
  }

  it('allows the request without querying the database when no permission is required', async () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(undefined) } as unknown as Reflector;
    const findFirst = jest.fn();
    const prisma = { rolePermission: { findFirst } } as any;
    const guard = new PermissionsGuard(reflector, prisma);

    const result = await guard.canActivate(buildContext({ role: 'Administrador' }));

    expect(result).toBe(true);
    expect(findFirst).not.toHaveBeenCalled();
  });

  it('allows the request when the role has the required permission', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue({ module: 'roles', action: 'create' }),
    } as unknown as Reflector;
    const findFirst = jest.fn().mockResolvedValue({ roleId: '1', permissionId: 'p1' });
    const prisma = { rolePermission: { findFirst } } as any;
    const guard = new PermissionsGuard(reflector, prisma);

    const result = await guard.canActivate(buildContext({ role: 'Administrador' }));

    expect(result).toBe(true);
    expect(findFirst).toHaveBeenCalledWith({
      where: { role: { name: 'Administrador' }, permission: { module: 'roles', action: 'create' } },
    });
  });

  it('throws ForbiddenException when the role does not have the required permission', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue({ module: 'roles', action: 'create' }),
    } as unknown as Reflector;
    const findFirst = jest.fn().mockResolvedValue(null);
    const prisma = { rolePermission: { findFirst } } as any;
    const guard = new PermissionsGuard(reflector, prisma);

    await expect(guard.canActivate(buildContext({ role: 'Comprador' }))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('does not throw an unhandled error when there is no authenticated user, and ends up forbidden', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue({ module: 'roles', action: 'create' }),
    } as unknown as Reflector;
    const findFirst = jest.fn().mockResolvedValue(null);
    const prisma = { rolePermission: { findFirst } } as any;
    const guard = new PermissionsGuard(reflector, prisma);

    await expect(guard.canActivate(buildContext(undefined))).rejects.toThrow(ForbiddenException);
    expect(findFirst).toHaveBeenCalledWith({
      where: { role: { name: undefined }, permission: { module: 'roles', action: 'create' } },
    });
  });

  it('reads metadata with the REQUIRE_PERMISSION_KEY token', async () => {
    const getAllAndOverride = jest.fn().mockReturnValue(undefined);
    const reflector = { getAllAndOverride } as unknown as Reflector;
    const prisma = { rolePermission: { findFirst: jest.fn() } } as any;
    const guard = new PermissionsGuard(reflector, prisma);

    await guard.canActivate(buildContext({ role: 'Administrador' }));

    expect(getAllAndOverride).toHaveBeenCalledWith(REQUIRE_PERMISSION_KEY, expect.any(Array));
  });
});
