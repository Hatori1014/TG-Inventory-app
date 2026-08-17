import { Inject, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { USER_REPOSITORY, UserRepository } from '../../domain/user.repository.interface';
import { AuthenticatedUserDto } from '../../dto/authenticated-user.dto';

// Exported by UsersModule for AuthModule to consume (ADR-26). Owns the
// entire "is this login attempt valid" rule inside users — bcrypt.compare
// and isActive() never leave this module, and neither does the User entity
// or its passwordHash. Returns null for a missing user, a wrong password,
// and a blocked user alike, so the caller structurally cannot tell them
// apart (no user/status enumeration).
@Injectable()
export class ValidateUserCredentialsUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly userRepository: UserRepository) {}

  async execute(email: string, password: string): Promise<AuthenticatedUserDto | null> {
    const user = await this.userRepository.findByEmail(email);
    const passwordMatches = user ? await bcrypt.compare(password, user.getPasswordHash()) : false;

    if (!user || !passwordMatches || !user.isActive()) {
      return null;
    }

    return {
      id: user.getId(),
      name: user.getName(),
      email: user.getEmail(),
      role: user.getRoleName(),
    };
  }
}
