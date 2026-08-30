import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

// Filter by module/action — the same vocabulary @RequirePermission() uses
// — for the "identificación rápida del módulo y qué acción genera el
// error" the user asked for.
export class ListErrorEventsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  module?: string;

  @IsOptional()
  @IsString()
  action?: string;
}
