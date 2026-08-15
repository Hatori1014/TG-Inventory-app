import { ArrayUnique, IsArray, IsUUID } from 'class-validator';

// Only replaces the role's permission set — name/description are not
// editable via this endpoint (plan section 7.4, literal "Editar permisos").
export class UpdateRolePermissionsDto {
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  permissionIds: string[];
}
