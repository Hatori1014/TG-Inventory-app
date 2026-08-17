import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsUUID('4')
  unitId: string;

  @IsOptional()
  @IsUUID('4')
  categoryId?: string;

  // HU-09 — defaults to false at the DB level (schema.prisma) when omitted.
  @IsOptional()
  @IsBoolean()
  requiresBatch?: boolean;
}
