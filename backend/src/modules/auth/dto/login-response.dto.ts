import { AuthenticatedUserDto } from '../../users/dto/authenticated-user.dto';

export interface LoginResponseDto {
  accessToken: string;
  user: AuthenticatedUserDto;
}
