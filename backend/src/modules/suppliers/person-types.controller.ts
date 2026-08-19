import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { CreatePersonTypeUseCase } from './application/use-cases/create-person-type.use-case';
import { ListPersonTypesUseCase } from './application/use-cases/list-person-types.use-case';
import { UpdatePersonTypeUseCase } from './application/use-cases/update-person-type.use-case';
import { CreatePersonTypeDto } from './dto/create-person-type.dto';
import { UpdatePersonTypeDto } from './dto/update-person-type.dto';
import { PersonTypeResponseDto } from './dto/person-type-response.dto';

// Same reasoning as DocumentTypesController: this catalog supports
// Supplier, gated the same as suppliers itself ("Comprador" minimum, GET
// included), unlike Category/Unit's open GET (they support Product).
@ApiTags('person-types')
@Controller('person-types')
export class PersonTypesController {
  constructor(
    private readonly createPersonTypeUseCase: CreatePersonTypeUseCase,
    private readonly listPersonTypesUseCase: ListPersonTypesUseCase,
    private readonly updatePersonTypeUseCase: UpdatePersonTypeUseCase,
  ) {}

  @RequirePermission('person-types', 'read')
  @Get()
  list(@Query() query: PaginationQueryDto): Promise<PaginatedResponseDto<PersonTypeResponseDto>> {
    return this.listPersonTypesUseCase.execute(query);
  }

  @RequirePermission('person-types', 'create')
  @Post()
  create(@Body() dto: CreatePersonTypeDto): Promise<PersonTypeResponseDto> {
    return this.createPersonTypeUseCase.execute(dto);
  }

  @RequirePermission('person-types', 'update')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePersonTypeDto): Promise<PersonTypeResponseDto> {
    return this.updatePersonTypeUseCase.execute(id, dto);
  }
}
