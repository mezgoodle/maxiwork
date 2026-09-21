import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let mockAuthService: any;

  beforeEach(async () => {
    mockAuthService = {
      register: jest.fn(),
      login: jest.fn(),
      refreshTokens: jest.fn(),
      logout: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('register should call authService.register', async () => {
    const dto = {
      name: 'John',
      email: 'john@example.com',
      password: 'password123',
    };
    mockAuthService.register.mockResolvedValue({
      _id: '1',
      name: 'John',
      email: 'john@example.com',
    });

    const result = await controller.register(dto);
    expect(mockAuthService.register).toHaveBeenCalledWith(dto);
    expect(result).toHaveProperty('email', 'john@example.com');
  });

  it('login should call authService.login', async () => {
    const user = { _id: '1', email: 'john@example.com' };
    const tokens = { access_token: 'acc', refresh_token: 'ref' };
    mockAuthService.login.mockResolvedValue(tokens);

    const result = await controller.login(user, {
      email: 'john@example.com',
      password: 'pwd',
    });
    expect(mockAuthService.login).toHaveBeenCalledWith(user);
    expect(result).toEqual(tokens);
  });

  it('refresh should call authService.refreshTokens', async () => {
    const tokens = { access_token: 'new-acc', refresh_token: 'new-ref' };
    mockAuthService.refreshTokens.mockResolvedValue(tokens);

    const result = await controller.refresh({ refresh_token: 'old-ref' });
    expect(mockAuthService.refreshTokens).toHaveBeenCalledWith('old-ref');
    expect(result).toEqual(tokens);
  });

  it('logout should call authService.logout', async () => {
    mockAuthService.logout.mockResolvedValue({
      message: 'Successfully logged out',
    });

    const result = await controller.logout({ refresh_token: 'token' });
    expect(mockAuthService.logout).toHaveBeenCalledWith('token');
    expect(result).toEqual({ message: 'Successfully logged out' });
  });

  it('getProfile should return user', () => {
    const user = { _id: '1', email: 'john@example.com' };
    expect(controller.getProfile(user)).toEqual(user);
  });
});
