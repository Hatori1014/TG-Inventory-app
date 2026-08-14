import { Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import {
  AUTH_USER_REPOSITORY,
  AuthUserRepository,
} from '../../domain/auth-user.repository.interface';
import { LoginResponseDto } from '../../dto/login-response.dto';

// Same generic message for "no such user", "wrong password" and "blocked
// user" — never let a caller tell those three apart (avoids user/status
// enumeration).
const INVALID_CREDENTIALS_MESSAGE = 'Usuario o contraseña incorrectos';

@Injectable()
export class LoginUseCase {
  private readonly logger = new Logger(LoginUseCase.name);

  constructor(
    @Inject(AUTH_USER_REPOSITORY) private readonly userRepository: AuthUserRepository,
    private readonly jwtService: JwtService,
  ) {}

  async execute(email: string, password: string): Promise<LoginResponseDto> {
    const user = await this.userRepository.findByEmail(email);
    const passwordMatches = user ? await bcrypt.compare(password, user.getPasswordHash()) : false;

    if (!user || !passwordMatches || !user.isActive()) {
      this.logger.warn(`Failed login attempt for ${email}`);
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    const payload = {
      sub: user.getId(),
      email: user.getEmail(),
      name: user.getName(),
      role: user.getRoleName(),
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.getId(),
        name: user.getName(),
        email: user.getEmail(),
        role: user.getRoleName(),
      },
    };
  }
}
