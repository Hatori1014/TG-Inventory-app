import { Injectable } from '@nestjs/common';
import { DocumentTypePrismaRepository } from '../../infrastructure/document-type.prisma.repository';
import { DocumentTypeResponseDto } from '../../dto/document-type-response.dto';
import { toDocumentTypeResponseDto } from '../document-type-response.mapper';
import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';
import { PaginatedResponseDto } from '../../../../common/dto/paginated-response.dto';
import { buildPaginatedResponse, toPrismaSkipTake } from '../../../../common/utils/pagination.util';

@Injectable()
export class ListDocumentTypesUseCase {
  constructor(private readonly documentTypeRepository: DocumentTypePrismaRepository) {}

  async execute(query: PaginationQueryDto): Promise<PaginatedResponseDto<DocumentTypeResponseDto>> {
    const { skip, take } = toPrismaSkipTake(query);
    const { items, total } = await this.documentTypeRepository.findAllPaginated(skip, take);
    return buildPaginatedResponse(items.map(toDocumentTypeResponseDto), total, query);
  }
}
