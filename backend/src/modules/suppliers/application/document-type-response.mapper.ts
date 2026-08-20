import { DocumentType } from '@prisma/client';
import { DocumentTypeResponseDto } from '../dto/document-type-response.dto';

export function toDocumentTypeResponseDto(documentType: DocumentType): DocumentTypeResponseDto {
  return {
    id: documentType.id,
    name: documentType.name,
    status: documentType.status,
  };
}
