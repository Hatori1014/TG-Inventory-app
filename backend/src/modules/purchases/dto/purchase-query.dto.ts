import { IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

// HU-13 — "Listar compras" (plan section 7.4). Extends the shared TT-19
// pagination shape; supplierId filter is what HU-05's per-supplier history
// screen will use against this same endpoint.
export class PurchaseQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID('4')
  supplierId?: string;
}
