import { User } from '../domain/user.entity';
import { UserResponseDto } from '../dto/user-response.dto';

// Never includes passwordHash.
export function toUserResponseDto(user: User): UserResponseDto {
  return {
    id: user.getId(),
    name: user.getName(),
    email: user.getEmail(),
    role: { id: user.getRoleId(), name: user.getRoleName() },
    status: user.getStatus(),
  };
}
