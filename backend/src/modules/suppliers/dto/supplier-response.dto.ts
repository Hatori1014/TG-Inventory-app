import { DocumentTypeResponseDto } from './document-type-response.dto';
import { PersonTypeResponseDto } from './person-type-response.dto';

export interface SupplierResponseDto {
  id: string;
  name: string;
  taxId: string | null;
  documentType: DocumentTypeResponseDto | null;
  personType: PersonTypeResponseDto | null;
  contact: string | null;
  phone: string | null;
  email: string | null;
  status: 'active' | 'inactive';
}
