import { Permission } from './permission.model';

export interface Role {
  id: string;
  name: string;
  description: string | null;
  permissions: Permission[];
  // Default-role feature — the role every new user starts on; never
  // deletable (the backend refuses with 409 regardless of this flag, this
  // is only used to hide/disable the delete action in the UI).
  isDefault: boolean;
}

export interface CreateRoleRequest {
  name: string;
  description?: string;
}

export interface UpdateRolePermissionsRequest {
  permissionIds: string[];
}
