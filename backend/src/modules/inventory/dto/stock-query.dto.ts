import { IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

// HU-10 — "Consultar stock actual (filtrable por producto/ubicación)"
// (plan section 7.4). Extends the shared TT-19 pagination shape.
export class StockQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID('4')
  productId?: string;

  @IsOptional()
  @IsUUID('4')
  locationId?: string;
}
