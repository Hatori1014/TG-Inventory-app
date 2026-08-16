import { IsIn, IsNumber, IsOptional, IsPositive, IsString, IsUUID, MaxLength, ValidateIf } from 'class-validator';

export class CreateMovementDto {
  @IsUUID('4')
  productId: string;

  // For in/out/adjustment: the location the movement happens at.
  // For transfer: the source location (stock decreases here).
  @IsUUID('4')
  locationId: string;

  @IsOptional()
  @IsUUID('4')
  batchId?: string;

  // "transfer" is a client-facing category, not a raw MovementType — a
  // single transfer creates a paired transfer_out/transfer_in under the
  // hood (ADR-28). A client never requests transfer_in/transfer_out
  // directly; those only ever exist as the two ledger rows of one transfer.
  @IsIn(['in', 'out', 'adjustment', 'transfer'])
  type: 'in' | 'out' | 'adjustment' | 'transfer';

  @IsNumber()
  @IsPositive()
  quantity: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  // Required only when type === 'adjustment' (ADR-28: insufficient stock on
  // a "decrease" is rejected, same as "out").
  @ValidateIf((dto: CreateMovementDto) => dto.type === 'adjustment')
  @IsIn(['increase', 'decrease'])
  direction?: 'increase' | 'decrease';

  // Required only when type === 'transfer' — the destination location
  // (stock increases here); locationId above is the source.
  @ValidateIf((dto: CreateMovementDto) => dto.type === 'transfer')
  @IsUUID('4')
  destinationLocationId?: string;
}
