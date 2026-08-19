import { Supplier } from '@prisma/client';
import { SupplierResponseDto } from '../dto/supplier-response.dto';

export function toSupplierResponseDto(supplier: Supplier): SupplierResponseDto {
  return {
    id: supplier.id,
    name: supplier.name,
    taxId: supplier.taxId,
    contact: supplier.contact,
    phone: supplier.phone,
    email: supplier.email,
    status: supplier.status,
  };
}
