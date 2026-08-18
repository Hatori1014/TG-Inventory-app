import { Controller, Body, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser, AuthenticatedRequestUser } from '../../common/decorators/current-user.decorator';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { LogoutUseCase } from './application/use-cases/logout.use-case';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';

// HU-01 — login. GET /auth/me is still not built: the frontend restores its
// session by decoding the JWT it already holds, no roundtrip needed.
// POST /auth/logout (ADR-32) revokes the caller's own token server-side —
// a stateless JWT can't be deleted, so it's blocklisted by jti until it
// would have expired naturally anyway.
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly logoutUseCase: LogoutUseCase,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto): Promise<LoginResponseDto> {
    return this.loginUseCase.execute(dto.email, dto.password);
  }

  @ApiBearerAuth()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@CurrentUser() user: AuthenticatedRequestUser): Promise<void> {
    return this.logoutUseCase.execute(user.jti, user.exp);
  }
}
