import { IsIn, IsNumber, IsOptional, IsPositive, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateMovementDto {
  @IsUUID('4')
  productId: string;

  @IsUUID('4')
  locationId: string;

  @IsOptional()
  @IsUUID('4')
  batchId?: string;

  // HU-07 scope: only "in" is wired up (associate/initialize stock at a
  // location). HU-08 loosens this to out/transfer_in/transfer_out/adjustment.
  @IsIn(['in'])
  type: 'in';

  @IsNumber()
  @IsPositive()
  quantity: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
