import { Role } from '../domain/role.entity';
import { Permission } from '../domain/permission.value-object';
import { RoleResponseDto } from '../dto/role-response.dto';
import { PermissionResponseDto } from '../dto/permission-response.dto';

// Permission instances reaching this mapper always came from persistence
// (via a repository), so `id` is always set — it's only optional at the
// type level to let domain tests construct a Permission without one.
export function toPermissionResponseDto(permission: Permission): PermissionResponseDto {
  return {
    id: permission.getId() as string,
    module: permission.getModule(),
    action: permission.getAction(),
  };
}

export function toRoleResponseDto(role: Role): RoleResponseDto {
  return {
    id: role.getId(),
    name: role.getName(),
    description: role.getDescription(),
    permissions: role.getPermissions().map(toPermissionResponseDto),
  };
}
