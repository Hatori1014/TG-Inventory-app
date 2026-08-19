export interface SupplierResponseDto {
  id: string;
  name: string;
  taxId: string | null;
  contact: string | null;
  phone: string | null;
  email: string | null;
  status: 'active' | 'inactive';
}
