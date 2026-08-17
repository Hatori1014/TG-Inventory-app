import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { CreateRoleUseCase } from './application/use-cases/create-role.use-case';
import { ListRolesUseCase } from './application/use-cases/list-roles.use-case';
import { UpdateRolePermissionsUseCase } from './application/use-cases/update-role-permissions.use-case';
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
  ) {}

  @RequirePermission('roles', 'read')
  @Get()
  list(@Query() query: PaginationQueryDto): Promise<PaginatedResponseDto<RoleResponseDto>> {
    return this.listRolesUseCase.execute(query);
  }

  @RequirePermission('roles', 'create')
  @Post()
  create(@Body() dto: CreateRoleDto): Promise<RoleResponseDto> {
    return this.createRoleUseCase.execute(dto);
  }

  // Only replaces the role's permission set — name/description are not
  // editable via this endpoint (plan section 7.4, literal "Editar permisos").
  @RequirePermission('roles', 'update')
  @Patch(':id')
  updatePermissions(
    @Param('id') id: string,
    @Body() dto: UpdateRolePermissionsDto,
  ): Promise<RoleResponseDto> {
    return this.updateRolePermissionsUseCase.execute(id, dto.permissionIds);
  }
}
