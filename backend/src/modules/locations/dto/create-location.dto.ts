import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateLocationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  parentId?: string;
}
