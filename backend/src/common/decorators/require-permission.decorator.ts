import { SetMetadata } from '@nestjs/common';

export const REQUIRE_PERMISSION_KEY = 'requirePermission';

export interface RequiredPermission {
  module: string;
  action: string;
}

// Usage: @RequirePermission('roles', 'create') on a controller method.
// Enforced by PermissionsGuard (ADR-25).
export const RequirePermission = (module: string, action: string) =>
  SetMetadata(REQUIRE_PERMISSION_KEY, { module, action } as RequiredPermission);
