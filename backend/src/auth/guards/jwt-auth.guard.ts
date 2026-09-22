import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  override handleRequest<TUser = any>(
    err: unknown,
    user: unknown,
    info: unknown,
  ): TUser {
    if (err || !user) {
      if (
        info &&
        typeof info === 'object' &&
        'name' in info &&
        (info as { name: string }).name === 'TokenExpiredError'
      ) {
        throw new UnauthorizedException('Token has expired');
      }
      if (err instanceof Error) {
        throw err;
      }
      throw new UnauthorizedException('Unauthorized access');
    }
    return user as TUser;
  }
}
