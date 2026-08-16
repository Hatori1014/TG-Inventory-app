import { IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

// imageUrl (HU-26/27) is intentionally not here — out of scope until then.
// status lets a product be "deleted" without a physical DELETE (same
// pattern as ADR-22). requiresBatch added in HU-09 (was deferred by HU-28).
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

  @IsOptional()
  @IsBoolean()
  requiresBatch?: boolean;
}
