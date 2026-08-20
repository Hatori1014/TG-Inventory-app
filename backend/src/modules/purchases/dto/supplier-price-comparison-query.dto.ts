import { ArrayMaxSize, ArrayMinSize, IsArray, IsUUID } from 'class-validator';

// DoR resolved by the user: "dos o los proveedores que se seleccionen con
// un máximo de 3 proveedores" — 2 to 3 suppliers. Sent as repeated query
// params (?supplierIds=A&supplierIds=B), which Express's default query
// parser (qs) already turns into an array — no @Transform needed.
export class SupplierPriceComparisonQueryDto {
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(3)
  @IsUUID('4', { each: true })
  supplierIds: string[];
}
