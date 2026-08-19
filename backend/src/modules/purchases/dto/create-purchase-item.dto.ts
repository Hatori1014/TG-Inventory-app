import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, IsUUID, Min, MaxLength } from 'class-validator';

export class CreatePurchaseItemDto {
  @IsUUID('4')
  productId: string;

  // Destination location for THIS item, at the user's explicit request — a
  // single purchase can restock more than one location.
  @IsUUID('4')
  locationId: string;

  // A human-entered lot code, not a batchId — RegisterPurchaseUseCase looks
  // it up (and creates it if missing) within the transaction. Required only
  // when the product has requiresBatch=true (checked in the use-case, same
  // as HU-08/09's validateProductAndBatch — class-validator can't run an
  // async DB check declaratively).
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  batchNumber?: string;

  @IsOptional()
  @IsDateString()
  batchExpiresAt?: string;

  @IsNumber()
  @IsPositive()
  quantity: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;
}
