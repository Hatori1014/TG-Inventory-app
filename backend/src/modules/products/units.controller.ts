import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { CreateUnitUseCase } from './application/use-cases/create-unit.use-case';
import { ListUnitsUseCase } from './application/use-cases/list-units.use-case';
import { UpdateUnitUseCase } from './application/use-cases/update-unit.use-case';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { UnitResponseDto } from './dto/unit-response.dto';

// GET is "any authenticated user" (plan section 7.4) — no @RequirePermission
// here, only the global JwtAuthGuard applies.
@ApiTags('units')
@Controller('units')
export class UnitsController {
  constructor(
    private readonly createUnitUseCase: CreateUnitUseCase,
    private readonly listUnitsUseCase: ListUnitsUseCase,
    private readonly updateUnitUseCase: UpdateUnitUseCase,
  ) {}

  @Get()
  list(@Query() query: PaginationQueryDto): Promise<PaginatedResponseDto<UnitResponseDto>> {
    return this.listUnitsUseCase.execute(query);
  }

  @RequirePermission('units', 'create')
  @Post()
  create(@Body() dto: CreateUnitDto): Promise<UnitResponseDto> {
    return this.createUnitUseCase.execute(dto);
  }

  @RequirePermission('units', 'update')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUnitDto): Promise<UnitResponseDto> {
    return this.updateUnitUseCase.execute(id, dto);
  }
}
