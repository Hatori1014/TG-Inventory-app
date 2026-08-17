import { Permission } from './permission.model';

export interface Role {
  id: string;
  name: string;
  description: string | null;
  permissions: Permission[];
}

export interface CreateRoleRequest {
  name: string;
  description?: string;
}

export interface UpdateRolePermissionsRequest {
  permissionIds: string[];
}
