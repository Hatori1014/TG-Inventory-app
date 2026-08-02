import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

// HU-02, HU-21 — RBAC enforced in the backend. Never rely solely on the
// frontend hiding a button (see cross-cutting security note, plan section 7.4).
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    const hasPermission = requiredRoles.includes(user?.role);
    if (!hasPermission) {
      throw new ForbiddenException('You do not have permission to perform this action');
    }
    return true;
  }
}
