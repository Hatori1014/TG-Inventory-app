import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

// TT-19 — shared query shape for every listing endpoint (HU-05, HU-08,
// HU-10, ...). pageSize is capped so a client can't request an unbounded
// result set and turn a listing endpoint into the "noisy neighbor" TT-16
// was written to prevent.
export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;
}
