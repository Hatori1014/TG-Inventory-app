import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { CreateLocationUseCase } from './application/use-cases/create-location.use-case';
import { ListLocationsUseCase } from './application/use-cases/list-locations.use-case';
import { UpdateLocationUseCase } from './application/use-cases/update-location.use-case';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { LocationResponseDto } from './dto/location-response.dto';

// Master plan section 7.4: all three endpoints require "Admin Inventario"
// (unlike HU-28's products/categories/units, whose GET is any authenticated
// user) — so GET also carries @RequirePermission, same pattern as HU-02/03.
@ApiTags('locations')
@Controller('locations')
export class LocationsController {
  constructor(
    private readonly createLocationUseCase: CreateLocationUseCase,
    private readonly listLocationsUseCase: ListLocationsUseCase,
    private readonly updateLocationUseCase: UpdateLocationUseCase,
  ) {}

  @RequirePermission('locations', 'read')
  @Get()
  list(@Query() query: PaginationQueryDto): Promise<PaginatedResponseDto<LocationResponseDto>> {
    return this.listLocationsUseCase.execute(query);
  }

  @RequirePermission('locations', 'create')
  @Post()
  create(@Body() dto: CreateLocationDto): Promise<LocationResponseDto> {
    return this.createLocationUseCase.execute(dto);
  }

  @RequirePermission('locations', 'update')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateLocationDto): Promise<LocationResponseDto> {
    return this.updateLocationUseCase.execute(id, dto);
  }
}
