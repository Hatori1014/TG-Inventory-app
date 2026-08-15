import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

// Partial update: name/email/roleId/status. No password field — changing an
// existing user's password is out of scope for this HU (see ADR-26); there
// is no reset endpoint yet. At least one field must be present, enforced in
// UpdateUserUseCase (not expressible cleanly as a single class-validator
// decorator here).
export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsUUID('4')
  roleId?: string;

  @IsOptional()
  @IsIn(['active', 'blocked'])
  status?: 'active' | 'blocked';
}
