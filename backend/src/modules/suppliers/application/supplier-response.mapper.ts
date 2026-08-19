import { Prisma } from '@prisma/client';
import { SupplierResponseDto } from '../dto/supplier-response.dto';
import { toDocumentTypeResponseDto } from './document-type-response.mapper';
import { toPersonTypeResponseDto } from './person-type-response.mapper';

export const supplierWithRelations = Prisma.validator<Prisma.SupplierDefaultArgs>()({
  include: { documentType: true, personType: true },
});
export type SupplierWithRelations = Prisma.SupplierGetPayload<typeof supplierWithRelations>;

export function toSupplierResponseDto(supplier: SupplierWithRelations): SupplierResponseDto {
  return {
    id: supplier.id,
    name: supplier.name,
    taxId: supplier.taxId,
    documentType: supplier.documentType ? toDocumentTypeResponseDto(supplier.documentType) : null,
    personType: supplier.personType ? toPersonTypeResponseDto(supplier.personType) : null,
    contact: supplier.contact,
    phone: supplier.phone,
    email: supplier.email,
    status: supplier.status,
  };
}
