import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DocumentTypePrismaRepository } from '../../infrastructure/document-type.prisma.repository';
import { UpdateDocumentTypeDto } from '../../dto/update-document-type.dto';
import { DocumentTypeResponseDto } from '../../dto/document-type-response.dto';
import { toDocumentTypeResponseDto } from '../document-type-response.mapper';
import { isUniqueConstraintViolation } from '../../../../common/utils/prisma-error.util';

@Injectable()
export class UpdateDocumentTypeUseCase {
  constructor(private readonly documentTypeRepository: DocumentTypePrismaRepository) {}

  async execute(id: string, dto: UpdateDocumentTypeDto): Promise<DocumentTypeResponseDto> {
    if (dto.name === undefined && dto.status === undefined) {
      throw new BadRequestException('At least one field must be provided');
    }

    const existing = await this.documentTypeRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Document type ${id} not found`);
    }

    try {
      const updated = await this.documentTypeRepository.update(id, dto);
      return toDocumentTypeResponseDto(updated);
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new ConflictException(`A document type named "${dto.name}" already exists`);
      }
      throw error;
    }
  }
}
