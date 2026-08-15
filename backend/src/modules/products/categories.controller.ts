import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { CreateCategoryUseCase } from './application/use-cases/create-category.use-case';
import { ListCategoriesUseCase } from './application/use-cases/list-categories.use-case';
import { UpdateCategoryUseCase } from './application/use-cases/update-category.use-case';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryResponseDto } from './dto/category-response.dto';

// GET is "any authenticated user" (plan section 7.4) — no @RequirePermission
// here, only the global JwtAuthGuard applies.
@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(
    private readonly createCategoryUseCase: CreateCategoryUseCase,
    private readonly listCategoriesUseCase: ListCategoriesUseCase,
    private readonly updateCategoryUseCase: UpdateCategoryUseCase,
  ) {}

  @Get()
  list(@Query() query: PaginationQueryDto): Promise<PaginatedResponseDto<CategoryResponseDto>> {
    return this.listCategoriesUseCase.execute(query);
  }

  @RequirePermission('categories', 'create')
  @Post()
  create(@Body() dto: CreateCategoryDto): Promise<CategoryResponseDto> {
    return this.createCategoryUseCase.execute(dto);
  }

  @RequirePermission('categories', 'update')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto): Promise<CategoryResponseDto> {
    return this.updateCategoryUseCase.execute(id, dto);
  }
}
