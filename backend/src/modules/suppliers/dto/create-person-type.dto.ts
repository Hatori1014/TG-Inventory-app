import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreatePersonTypeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;
}
