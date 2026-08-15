import { IsIn, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

// requiresBatch (HU-09) and imageUrl (HU-26/27) are intentionally not here —
// out of scope for this HU. status lets a product be "deleted" without a
// physical DELETE (same pattern as ADR-22).
export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsUUID('4')
  unitId?: string;

  @IsOptional()
  @IsUUID('4')
  categoryId?: string;

  @IsOptional()
  @IsIn(['active', 'discontinued'])
  status?: 'active' | 'discontinued';
}
