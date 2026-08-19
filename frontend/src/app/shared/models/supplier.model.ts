// Mirrors the backend DTO (plan section 7.4) — keep in sync by hand until
// it's worth sharing a types package between backend/ and frontend/.
import { DocumentType } from './document-type.model';
import { PersonType } from './person-type.model';

export interface Supplier {
  id: string;
  name: string;
  taxId: string | null;
  documentType: DocumentType | null; // selected from the DocumentType catalog, not free text (HU-04)
  personType: PersonType | null; // selected from the PersonType catalog, not free text (HU-04)
  contact: string | null;
  phone: string | null;
  email: string | null;
  status: 'active' | 'inactive';
}

export interface CreateSupplierRequest {
  name: string;
  taxId?: string;
  documentTypeId?: string;
  personTypeId?: string;
  contact?: string;
  phone?: string;
  email?: string;
}

export interface UpdateSupplierRequest {
  name?: string;
  taxId?: string;
  documentTypeId?: string;
  personTypeId?: string;
  contact?: string;
  phone?: string;
  email?: string;
  status?: 'active' | 'inactive';
}
