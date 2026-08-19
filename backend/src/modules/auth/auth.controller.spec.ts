import { Test } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { LogoutUseCase } from './application/use-cases/logout.use-case';

describe('AuthController', () => {
  let controller: AuthController;
  let loginUseCase: jest.Mocked<LoginUseCase>;
  let logoutUseCase: jest.Mocked<LogoutUseCase>;

  beforeEach(async () => {
    loginUseCase = { execute: jest.fn() } as unknown as jest.Mocked<LoginUseCase>;
    logoutUseCase = { execute: jest.fn() } as unknown as jest.Mocked<LogoutUseCase>;

    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: LoginUseCase, useValue: loginUseCase },
        { provide: LogoutUseCase, useValue: logoutUseCase },
      ],
    }).compile();

    controller = moduleRef.get(AuthController);
  });

  it('delegates to LoginUseCase with the DTO credentials and returns its result', async () => {
    const expected = {
      accessToken: 'signed.jwt.token',
      user: { id: '1', name: 'Admin', email: 'admin@tg-group.local', role: 'Administrador' },
    };
    loginUseCase.execute.mockResolvedValue(expected);

    const result = await controller.login({ email: 'admin@tg-group.local', password: 'secret' });

    expect(loginUseCase.execute).toHaveBeenCalledWith('admin@tg-group.local', 'secret');
    expect(result).toBe(expected);
  });

  it('delegates to LogoutUseCase with the current token jti/exp', async () => {
    const user = {
      id: '1',
      name: 'Admin',
      email: 'admin@tg-group.local',
      role: 'Administrador',
      jti: 'token-id',
      exp: 1234567890,
    };

    await controller.logout(user);

    expect(logoutUseCase.execute).toHaveBeenCalledWith('token-id', 1234567890);
  });
});
