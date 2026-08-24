import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { Response } from 'express';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { MAX_IMAGE_SIZE_BYTES } from '../../common/utils/validate-uploaded-image.util';
import { CreateProductUseCase } from './application/use-cases/create-product.use-case';
import { ListProductsUseCase } from './application/use-cases/list-products.use-case';
import { UpdateProductUseCase } from './application/use-cases/update-product.use-case';
import { UploadProductImageUseCase } from './application/use-cases/upload-product-image.use-case';
import { GetProductImageUseCase } from './application/use-cases/get-product-image.use-case';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductResponseDto } from './dto/product-response.dto';

// GET is "any authenticated user" (plan section 7.4) — no @RequirePermission
// here, only the global JwtAuthGuard applies. Same for GET :id/image: it
// reads the product the same way GET/list does, so it carries the same gate.
@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(
    private readonly createProductUseCase: CreateProductUseCase,
    private readonly listProductsUseCase: ListProductsUseCase,
    private readonly updateProductUseCase: UpdateProductUseCase,
    private readonly uploadProductImageUseCase: UploadProductImageUseCase,
    private readonly getProductImageUseCase: GetProductImageUseCase,
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

  // HU-26/27 — image is treated as part of editing a product, same
  // permission as PATCH rather than a new one. Memory storage explicitly
  // (never disk — convenciones.md: uploads never get written to this
  // app's own disk, they go to R2). multer's own size limit is the first
  // line of defense (rejects an oversized file before it's even fully
  // read into memory); validateUploadedImage re-checks size on the
  // buffer too so that check is real even when this use-case is called
  // directly (e.g. from a test) rather than through this interceptor.
  @RequirePermission('products', 'update')
  @Post(':id/image')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: MAX_IMAGE_SIZE_BYTES } }))
  uploadImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ProductResponseDto> {
    return this.uploadProductImageUseCase.execute(id, file?.buffer);
  }

  @Get(':id/image')
  async getImage(
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { body, contentType } = await this.getProductImageUseCase.execute(id);
    res.set({ 'Content-Type': contentType });
    return new StreamableFile(body);
  }
}
