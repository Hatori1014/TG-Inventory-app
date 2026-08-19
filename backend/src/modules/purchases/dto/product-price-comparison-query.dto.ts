import { IsUUID } from 'class-validator';

export class ProductPriceComparisonQueryDto {
  @IsUUID('4')
  productId: string;
}
