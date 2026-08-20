import { IsNumber, Min } from 'class-validator';

// productId is not editable — ADR-22, same reasoning as everywhere else in
// this codebase: if the threshold needs to move to a different product,
// that's a new resource, not an edit of this one's identity. "Removing" a
// minimum is an update to 0, never a DELETE (no precedent for deleting
// here, per the user's explicit instruction).
export class UpdateMinimumStockDto {
  @IsNumber()
  @Min(0)
  minimumQuantity: number;
}
