import { PermissionResponseDto } from './permission-response.dto';

export interface RoleResponseDto {
  id: string;
  name: string;
  description: string | null;
  permissions: PermissionResponseDto[];
}
