import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { CreateProductUseCase } from './application/use-cases/create-product.use-case';
import { ListProductsUseCase } from './application/use-cases/list-products.use-case';
import { UpdateProductUseCase } from './application/use-cases/update-product.use-case';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductResponseDto } from './dto/product-response.dto';

// GET is "any authenticated user" (plan section 7.4) — no @RequirePermission
// here, only the global JwtAuthGuard applies. POST /products/:id/image
// (HU-26/27, post-MVP) is intentionally not here.
@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(
    private readonly createProductUseCase: CreateProductUseCase,
    private readonly listProductsUseCase: ListProductsUseCase,
    private readonly updateProductUseCase: UpdateProductUseCase,
  ) {}

  @Get()
  list(@Query() query: PaginationQueryDto): Promise<PaginatedResponseDto<ProductResponseDto>> {
    return this.listProductsUseCase.execute(query);
  }

  @RequirePermission('products', 'create')
  @Post()
  create(@Body() dto: CreateProductDto): Promise<ProductResponseDto> {
    return this.createProductUseCase.execute(dto);
  }

  @RequirePermission('products', 'update')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto): Promise<ProductResponseDto> {
    return this.updateProductUseCase.execute(id, dto);
  }
}
