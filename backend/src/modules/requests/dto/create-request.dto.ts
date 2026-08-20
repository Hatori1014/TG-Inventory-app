import { IsArray, IsBoolean, IsIn, IsOptional, IsString, IsUUID, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateRequestItemDto } from './create-request-item.dto';

// HU-15 — only 'purchase' enabled for now (same pattern as HU-07 enabling
// only MovementType 'in' first): HU-16 loosens this to add 'consumption'
// once its stock-availability check exists. supplierId/items are
// intentionally NOT required here — a draft can be saved with either
// missing; CreateRequestUseCase enforces "supplier + at least one item"
// only when saveAsDraft is false, via PurchaseRequestSubmission.canSubmit().
export class CreateRequestDto {
  @IsIn(['purchase'])
  type: 'purchase';

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
