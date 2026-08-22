import { IsNumber, IsOptional, IsPositive, IsUUID, Min } from 'class-validator';

export class CreateRequestItemDto {
  @IsUUID('4')
  productId: string;

  @IsUUID('4')
  locationId: string;

  @IsNumber()
  @IsPositive()
  quantity: number;

  // Purchase-only in practice (a hint for the requester/approver, never
  // the real transacted price) — optional either way, class-validator
  // can't express "required only for type=purchase" declaratively; the
  // use-case doesn't need it to be present at all.
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedPrice?: number;
}
