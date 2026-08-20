import { IsNumber, IsUUID, Min } from 'class-validator';

export class CreateMinimumStockDto {
  @IsUUID('4')
  productId: string;

  @IsNumber()
  @Min(0)
  minimumQuantity: number;
}
