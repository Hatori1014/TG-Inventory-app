import { Test } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { LoginUseCase } from './application/use-cases/login.use-case';

describe('AuthController', () => {
  let controller: AuthController;
  let loginUseCase: jest.Mocked<LoginUseCase>;

  beforeEach(async () => {
    loginUseCase = { execute: jest.fn() } as unknown as jest.Mocked<LoginUseCase>;

    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: LoginUseCase, useValue: loginUseCase }],
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
});
