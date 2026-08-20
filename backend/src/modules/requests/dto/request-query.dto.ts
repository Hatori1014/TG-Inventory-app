import { IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class RequestQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(['purchase', 'consumption'])
  type?: 'purchase' | 'consumption';

  @IsOptional()
  @IsIn(['draft', 'pending', 'in_review', 'approved', 'rejected', 'pending_inventory_integration', 'closed'])
  status?: string;
}
