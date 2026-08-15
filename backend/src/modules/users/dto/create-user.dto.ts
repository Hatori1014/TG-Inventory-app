import { IsEmail, IsNotEmpty, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsEmail()
  email: string;

  // 72: bcrypt's effective input limit — longer inputs are silently
  // truncated, so reject them explicitly instead.
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;

  // Required (not defaulted) — the HU's own criterion: "rol... campo
  // obligatorio al crear el usuario".
  @IsUUID('4')
  roleId: string;
}
