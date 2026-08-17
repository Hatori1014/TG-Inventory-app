import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { ListPermissionsUseCase } from './application/use-cases/list-permissions.use-case';
import { PermissionResponseDto } from './dto/permission-response.dto';

// Not in plan section 7.4's endpoint table (only GET/POST/PATCH /roles are)
// — added so the frontend can render the available module/action catalog
// when building the "assign permissions" checklist for PATCH /roles/:id.
@ApiTags('permissions')
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly listPermissionsUseCase: ListPermissionsUseCase) {}

  @RequirePermission('roles', 'read')
  @Get()
  list(@Query() query: PaginationQueryDto): Promise<PaginatedResponseDto<PermissionResponseDto>> {
    return this.listPermissionsUseCase.execute(query);
  }
}
