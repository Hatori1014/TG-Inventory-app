// Mirrors the backend DTO (plan section 7.4) — keep in sync by hand until
// it's worth sharing a types package between backend/ and frontend/.
export interface Supplier {
  id: string;
  name: string;
  taxId: string | null;
  contact: string | null;
  phone: string | null;
  email: string | null;
  status: 'active' | 'inactive';
}

export interface CreateSupplierRequest {
  name: string;
  taxId?: string;
  contact?: string;
  phone?: string;
  email?: string;
}

export interface UpdateSupplierRequest {
  name?: string;
  taxId?: string;
  contact?: string;
  phone?: string;
  email?: string;
  status?: 'active' | 'inactive';
}
