import { ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { IntegrateRequestItemDto } from './integrate-request-item.dto';

export class IntegrateRequestDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => IntegrateRequestItemDto)
  items: IntegrateRequestItemDto[];
}
