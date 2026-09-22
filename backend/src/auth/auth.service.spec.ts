import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { UnauthorizedException } from '@nestjs/common';
import { Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { RefreshToken } from './schemas/refresh-token.schema';

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashedPassword'),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let mockUsersService: any;
  let mockJwtService: any;
  let mockConfigService: any;
  let mockRefreshTokenModel: any;

  beforeEach(async () => {
    mockUsersService = {
      create: jest.fn(),
      findByEmail: jest.fn(),
      findById: jest.fn(),
    };

    mockJwtService = {
      signAsync: jest.fn(),
      verifyAsync: jest.fn(),
      decode: jest
        .fn()
        .mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 7 * 86400 }),
    };

    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'JWT_ACCESS_SECRET') return 'test_access_secret';
        if (key === 'JWT_REFRESH_SECRET') return 'test_refresh_secret';
        if (key === 'JWT_ACCESS_EXPIRATION') return '15m';
        if (key === 'JWT_REFRESH_EXPIRATION') return '7d';
        return null;
      }),
    };

    mockRefreshTokenModel = {
      create: jest.fn(),
      findOne: jest.fn(),
      findOneAndDelete: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue({}) }),
      deleteOne: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue({}) }),
      deleteMany: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue({}) }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        {
          provide: getModelToken(RefreshToken.name),
          useValue: mockRefreshTokenModel,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return user object without password on valid credentials', async () => {
      const mockUser = {
        _id: 'user1',
        email: 'test@example.com',
        password: 'hashedPassword',
        toObject: () => ({
          _id: 'user1',
          email: 'test@example.com',
          password: 'hashedPassword',
        }),
      };
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

      const result = await service.validateUser(
        'test@example.com',
        'password123',
      );
      expect(result).toEqual({
        _id: 'user1',
        email: 'test@example.com',
      });
      expect(result?.password).toBeUndefined();
    });

    it('should return null when password is invalid', async () => {
      const mockUser = {
        _id: 'user1',
        email: 'test@example.com',
        password: 'hashedPassword',
      };
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      const result = await service.validateUser(
        'test@example.com',
        'wrongpassword',
      );
      expect(result).toBeNull();
    });

    it('should return null when user does not exist', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      const result = await service.validateUser('none@example.com', 'pass');
      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('should return access_token and refresh_token and store refresh token', async () => {
      const userId = new Types.ObjectId();
      const user = { _id: userId, email: 'test@example.com' };

      mockJwtService.signAsync
        .mockResolvedValueOnce('access-token-xyz')
        .mockResolvedValueOnce('refresh-token-xyz');

      mockRefreshTokenModel.create.mockResolvedValue({});

      const result = await service.login(user);

      expect(result).toEqual({
        access_token: 'access-token-xyz',
        refresh_token: 'refresh-token-xyz',
      });
      expect(mockRefreshTokenModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          isRevoked: false,
        }),
      );
    });
  });

  describe('refreshTokens', () => {
    it('should rotate refresh token and return new tokens', async () => {
      const userId = new Types.ObjectId();
      const tokenDoc = {
        token: 'hashed-token',
        userId,
        expiresAt: new Date(Date.now() + 100000),
      };

      mockJwtService.verifyAsync.mockResolvedValue({
        sub: userId.toString(),
        email: 'test@example.com',
      });
      mockUsersService.findById.mockResolvedValue({
        _id: userId,
        email: 'test@example.com',
      });

      mockJwtService.signAsync
        .mockResolvedValueOnce('new-access-token')
        .mockResolvedValueOnce('new-refresh-token');
      mockRefreshTokenModel.findOneAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(tokenDoc),
      });
      mockRefreshTokenModel.create.mockResolvedValue({});

      const result = await service.refreshTokens('old-refresh-token');

      expect(mockRefreshTokenModel.findOneAndDelete).toHaveBeenCalled();
      expect(result).toEqual({
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
      });
    });

    it('should throw UnauthorizedException when token is expired or invalid in JWT', async () => {
      mockJwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      await expect(service.refreshTokens('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when token is revoked or expired in DB', async () => {
      const userId = new Types.ObjectId();
      mockJwtService.verifyAsync.mockResolvedValue({
        sub: userId.toString(),
        email: 'test@example.com',
      });
      mockUsersService.findById.mockResolvedValue({
        _id: userId,
        email: 'test@example.com',
      });
      mockJwtService.signAsync
        .mockResolvedValueOnce('new-access-token')
        .mockResolvedValueOnce('new-refresh-token');
      mockRefreshTokenModel.findOneAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.refreshTokens('revoked-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('should delete token from database', async () => {
      const result = await service.logout('active-token');

      expect(mockRefreshTokenModel.deleteOne).toHaveBeenCalled();
      expect(result).toEqual({ message: 'Successfully logged out' });
    });
  });
});
