import { UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  beforeEach(() => {
    guard = new JwtAuthGuard();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('handleRequest', () => {
    it('should return user if present and no error', () => {
      const user = { _id: '123', email: 'test@example.com' };
      const result = guard.handleRequest(null, user, null);
      expect(result).toBe(user);
    });

    it('should throw UnauthorizedException with expired message on TokenExpiredError', () => {
      const info = { name: 'TokenExpiredError', message: 'jwt expired' };
      expect(() => guard.handleRequest(null, null, info)).toThrow(
        new UnauthorizedException('Token has expired'),
      );
    });

    it('should throw error if error is provided', () => {
      const customError = new Error('Custom auth error');
      expect(() => guard.handleRequest(customError, null, null)).toThrow(
        customError,
      );
    });

    it('should throw UnauthorizedException if no user and no specific error', () => {
      expect(() => guard.handleRequest(null, null, null)).toThrow(
        new UnauthorizedException('Unauthorized access'),
      );
    });
  });
});
