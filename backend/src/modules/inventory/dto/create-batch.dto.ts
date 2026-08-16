import { IsDateString, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateBatchDto {
  @IsUUID('4')
  productId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  batchNumber: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  // Defaults to now() at the DB level (schema.prisma) when omitted — lets
  // an admin log a batch that physically arrived earlier than today.
  @IsOptional()
  @IsDateString()
  receivedAt?: string;
}
