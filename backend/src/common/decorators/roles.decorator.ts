import { SetMetadata } from '@nestjs/common';

// Usage: @Roles('admin', 'buyer') on a controller method.
// The role name must match ROLE.name in the database.
export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
