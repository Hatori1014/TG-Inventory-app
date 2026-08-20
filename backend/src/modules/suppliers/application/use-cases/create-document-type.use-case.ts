import { ConflictException, Injectable } from '@nestjs/common';
import { DocumentTypePrismaRepository } from '../../infrastructure/document-type.prisma.repository';
import { CreateDocumentTypeDto } from '../../dto/create-document-type.dto';
import { DocumentTypeResponseDto } from '../../dto/document-type-response.dto';
import { toDocumentTypeResponseDto } from '../document-type-response.mapper';
import { isUniqueConstraintViolation } from '../../../../common/utils/prisma-error.util';

@Injectable()
export class CreateDocumentTypeUseCase {
  constructor(private readonly documentTypeRepository: DocumentTypePrismaRepository) {}

  async execute(dto: CreateDocumentTypeDto): Promise<DocumentTypeResponseDto> {
    try {
      const documentType = await this.documentTypeRepository.create(dto.name);
      return toDocumentTypeResponseDto(documentType);
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new ConflictException(`A document type named "${dto.name}" already exists`);
      }
      throw error;
    }
  }
}
