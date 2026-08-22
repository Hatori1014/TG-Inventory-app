import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min, MaxLength } from 'class-validator';

// HU-17 — receiving-time detail, not captured at request time: a purchase
// request only ever holds an estimatedPrice (RequestItemInput) and no
// batch/lot number at all (that's only known once the goods actually
// arrive) — mirrors CreatePurchaseItemDto's own batchNumber/unitPrice
// rigor (HU-13).
export class IntegrateRequestItemDto {
  @IsUUID('4')
  requestItemId: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  batchNumber?: string;

  @IsOptional()
  @IsDateString()
  batchExpiresAt?: string;

  @IsNumber()
  @Min(0)
  unitPrice: number;
}
