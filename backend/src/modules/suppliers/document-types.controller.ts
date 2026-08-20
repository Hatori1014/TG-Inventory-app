import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { CreateDocumentTypeUseCase } from './application/use-cases/create-document-type.use-case';
import { ListDocumentTypesUseCase } from './application/use-cases/list-document-types.use-case';
import { UpdateDocumentTypeUseCase } from './application/use-cases/update-document-type.use-case';
import { CreateDocumentTypeDto } from './dto/create-document-type.dto';
import { UpdateDocumentTypeDto } from './dto/update-document-type.dto';
import { DocumentTypeResponseDto } from './dto/document-type-response.dto';

// Unlike Category/Unit's open GET (they support Product, whose GET is "any
// authenticated user"), this catalog supports Supplier — gated the same as
// suppliers itself ("Comprador" minimum, GET included, see
// SuppliersController) — so GET also carries @RequirePermission.
@ApiTags('document-types')
@Controller('document-types')
export class DocumentTypesController {
  constructor(
    private readonly createDocumentTypeUseCase: CreateDocumentTypeUseCase,
    private readonly listDocumentTypesUseCase: ListDocumentTypesUseCase,
    private readonly updateDocumentTypeUseCase: UpdateDocumentTypeUseCase,
  ) {}

  @RequirePermission('document-types', 'read')
  @Get()
  list(@Query() query: PaginationQueryDto): Promise<PaginatedResponseDto<DocumentTypeResponseDto>> {
    return this.listDocumentTypesUseCase.execute(query);
  }

  @RequirePermission('document-types', 'create')
  @Post()
  create(@Body() dto: CreateDocumentTypeDto): Promise<DocumentTypeResponseDto> {
    return this.createDocumentTypeUseCase.execute(dto);
  }

  @RequirePermission('document-types', 'update')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateDocumentTypeDto): Promise<DocumentTypeResponseDto> {
    return this.updateDocumentTypeUseCase.execute(id, dto);
  }
}
