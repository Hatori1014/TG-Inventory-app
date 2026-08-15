import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';

// HU-01 — the only endpoint of this iteration. GET /auth/me and
// POST /auth/logout are intentionally not built yet: the frontend restores
// its session by decoding the JWT it already holds, and logout is a
// client-side-only action for a stateless token (ADR-24).
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly loginUseCase: LoginUseCase) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto): Promise<LoginResponseDto> {
    return this.loginUseCase.execute(dto.email, dto.password);
  }
}
