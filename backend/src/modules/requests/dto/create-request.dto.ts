import { IsArray, IsBoolean, IsIn, IsOptional, IsString, IsUUID, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateRequestItemDto } from './create-request-item.dto';

// HU-15 enabled only 'purchase' (same pattern as HU-07 enabling only
// MovementType 'in' first); HU-16 loosens this for 'consumption', now
// that the stock-availability check exists (CreateRequestUseCase).
// supplierId/items are intentionally NOT required here at the DTO level:
// a purchase draft can be saved with either missing (CreateRequestUseCase
// enforces "supplier + at least one item" only when saveAsDraft is
// false, via PurchaseRequestSubmission.canSubmit()); consumption never
// supports drafts at all (rejected in the use-case) — its own criteria
// never mentions one, and RequestStatus's 4-value consumption cycle
// (pending -> approved/rejected -> closed) has no draft state to land in.
export class CreateRequestDto {
  @IsIn(['purchase', 'consumption'])
  type: 'purchase' | 'consumption';

  @IsOptional()
  @IsUUID('4')
  supplierId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRequestItemDto)
  items?: CreateRequestItemDto[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  @IsBoolean()
  saveAsDraft?: boolean;
}
