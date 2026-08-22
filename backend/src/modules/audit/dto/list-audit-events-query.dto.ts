import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

// Minimal filter set for HU-23's panel: narrow an incident investigation
// down to "what kind of thing" (entity/action) or "who" (userId) without
// trawling every page. Trello's criterion doesn't specify filters beyond
// "poder investigar cualquier incidente" — these three are the ones an
// admin would reach for first; more can be added later without a
// migration since they're plain indexed columns already.
export class ListAuditEventsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  entity?: string;

  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @IsString()
  userId?: string;
}
