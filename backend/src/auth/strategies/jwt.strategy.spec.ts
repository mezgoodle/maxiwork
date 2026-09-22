import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { UsersService } from '../../users/users.service';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let mockConfigService: any;
  let mockUsersService: any;

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn().mockReturnValue('test_secret'),
    };
    mockUsersService = {
      findById: jest.fn(),
    };

    strategy = new JwtStrategy(
      mockConfigService as ConfigService,
      mockUsersService as UsersService,
    );
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should return user if user exists', async () => {
      const mockUser = { _id: 'user1', email: 'test@example.com' };
      mockUsersService.findById.mockResolvedValue(mockUser);

      const result = await strategy.validate({
        sub: 'user1',
        email: 'test@example.com',
      });
      expect(result).toEqual(mockUser);
      expect(mockUsersService.findById).toHaveBeenCalledWith('user1');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockUsersService.findById.mockRejectedValue(new Error('Not found'));

      await expect(
        strategy.validate({
          sub: 'unknown',
          email: 'unknown@example.com',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
