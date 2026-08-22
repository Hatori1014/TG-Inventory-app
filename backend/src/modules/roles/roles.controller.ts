import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser, AuthenticatedRequestUser } from '../../common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { CreateRoleUseCase } from './application/use-cases/create-role.use-case';
import { ListRolesUseCase } from './application/use-cases/list-roles.use-case';
import { UpdateRolePermissionsUseCase } from './application/use-cases/update-role-permissions.use-case';
import { DeleteRoleUseCase, DeleteRoleResult } from './application/use-cases/delete-role.use-case';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';
import { RoleResponseDto } from './dto/role-response.dto';

@ApiTags('roles')
@Controller('roles')
export class RolesController {
  constructor(
    private readonly createRoleUseCase: CreateRoleUseCase,
    private readonly listRolesUseCase: ListRolesUseCase,
    private readonly updateRolePermissionsUseCase: UpdateRolePermissionsUseCase,
    private readonly deleteRoleUseCase: DeleteRoleUseCase,
  ) {}

  @RequirePermission('roles', 'read')
  @Get()
  list(@Query() query: PaginationQueryDto): Promise<PaginatedResponseDto<RoleResponseDto>> {
    return this.listRolesUseCase.execute(query);
  }

  @RequirePermission('roles', 'create')
  @Post()
  create(
    @Body() dto: CreateRoleDto,
    @CurrentUser() user: AuthenticatedRequestUser,
  ): Promise<RoleResponseDto> {
    return this.createRoleUseCase.execute(dto, user.id);
  }

  // Only replaces the role's permission set — name/description are not
  // editable via this endpoint (plan section 7.4, literal "Editar permisos").
  @RequirePermission('roles', 'update')
  @Patch(':id')
  updatePermissions(
    @Param('id') id: string,
    @Body() dto: UpdateRolePermissionsDto,
    @CurrentUser() user: AuthenticatedRequestUser,
  ): Promise<RoleResponseDto> {
    return this.updateRolePermissionsUseCase.execute(id, dto.permissionIds, user.id);
  }

  // Default-role feature, at the user's explicit request: logical delete
  // (ADR-22) — reassigns every user holding this role to the default role
  // first. The default role itself can never be deleted (409).
  @RequirePermission('roles', 'delete')
  @Delete(':id')
  delete(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedRequestUser,
  ): Promise<DeleteRoleResult> {
    return this.deleteRoleUseCase.execute(id, user.id);
  }
}
