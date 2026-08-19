import { IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

// HU-13 — "Listar compras" (plan section 7.4). Extends the shared TT-19
// pagination shape. supplierId is a generic filter for this endpoint;
// HU-05's per-supplier history screen ended up with its own dedicated
// endpoint instead (GET /suppliers/:id/purchases, plan section 7.4 lists it
// separately) — see SupplierPurchaseHistoryController.
export class PurchaseQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID('4')
  supplierId?: string;
}
