import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../database/prisma.service';
import { REQUIRE_PERMISSION_KEY, RequiredPermission } from '../decorators/require-permission.decorator';

// HU-02 — granular RBAC, enforced in the backend (never trust the frontend
// alone). Injects PrismaService directly, same pattern as
// IdempotencyInterceptor (ADR-21): a cross-cutting concern in common/ must
// not import roles/domain or roles/infrastructure from outside that module
// (ADR-18), so it queries the join table on its own instead of going
// through RoleRepository.
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<RequiredPermission>(REQUIRE_PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    // HU-31 — GlobalExceptionFilter needs to know which module/action a
    // failing request was for, but ArgumentsHost (what exception filters
    // receive) doesn't reliably expose getHandler()/getClass() the way
    // this guard's real ExecutionContext does — verified the hard way,
    // it crashed the whole process on the first real error once trusted.
    // This guard already resolves `required` to decide access, so it
    // stashes it on the request for the filter to read back, regardless
    // of whether the grant check below ends up passing or throwing.
    request.requiredPermission = required;
    const { user } = request;

    const grant = await this.prisma.rolePermission.findFirst({
      where: {
        role: { name: user?.role },
        permission: { module: required.module, action: required.action },
      },
    });

    if (!grant) {
      throw new ForbiddenException('You do not have permission to perform this action');
    }
    return true;
  }
}
