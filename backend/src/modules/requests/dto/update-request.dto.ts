import { IsArray, IsOptional, IsString, IsUUID, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateRequestItemDto } from './create-request-item.dto';

// HU-15 — editing is only allowed while status = draft (UpdateRequestUseCase
// enforces this, not this DTO); type is never editable, same reasoning as
// every other resource's identity in this codebase.
export class UpdateRequestDto {
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
}
