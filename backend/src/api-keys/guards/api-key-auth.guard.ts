import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiKeysService, ValidatedApiKeyPrincipal } from '../api-keys.service';

export type ApiKeyAuthenticatedRequest = Request & {
  user?: ValidatedApiKeyPrincipal;
};

@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  private extractApiKeyFromRequest(request: Request): string | null {
    const authHeader = request.headers.authorization;
    if (typeof authHeader === 'string' && authHeader.trim()) {
      const parts = authHeader.trim().split(/\s+/);
      if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
        return parts[1];
      }
    }

    const xApiKey = request.headers['x-api-key'];
    if (typeof xApiKey === 'string' && xApiKey.trim()) {
      return xApiKey.trim();
    }

    return null;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<ApiKeyAuthenticatedRequest>();

    const rawKey = this.extractApiKeyFromRequest(request);
    if (!rawKey) {
      throw new UnauthorizedException(
        'Missing API key in Authorization Bearer or x-api-key header',
      );
    }

    const principal = await this.apiKeysService.validateRawKey(rawKey);
    request.user = principal;
    return true;
  }
}
