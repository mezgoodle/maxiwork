import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { isObservable, firstValueFrom } from 'rxjs';
import { API_KEY_PREFIX } from '../../api-keys/api-keys.service';
import { ApiKeyAuthGuard } from '../../api-keys/guards/api-key-auth.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

export interface McpPrincipal {
  userId: string;
  apiKeyId?: string;
  [key: string]: unknown;
}

export type McpAuthenticatedRequest = Request & {
  user?: McpPrincipal;
};

@Injectable()
export class McpAuthGuard implements CanActivate {
  constructor(
    private readonly apiKeyAuthGuard: ApiKeyAuthGuard,
    private readonly jwtAuthGuard: JwtAuthGuard,
  ) {}

  private extractBearerToken(request: Request): string | null {
    const authHeader = request.headers.authorization;
    if (typeof authHeader === 'string' && authHeader.trim()) {
      const parts = authHeader.trim().split(/\s+/);
      if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
        return parts[1];
      }
    }
    return null;
  }

  private hasApiKeyHeader(request: Request): boolean {
    const xApiKey = request.headers['x-api-key'];
    return typeof xApiKey === 'string' && xApiKey.trim().length > 0;
  }

  private async executeGuard(
    guard: CanActivate,
    context: ExecutionContext,
  ): Promise<boolean> {
    const result = guard.canActivate(context);
    if (isObservable(result)) {
      return await firstValueFrom(result);
    }
    return await result;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<McpAuthenticatedRequest>();
    const bearerToken = this.extractBearerToken(request);
    const hasApiKey = this.hasApiKeyHeader(request);

    // If an x-api-key header is supplied, or the Bearer token starts with mxw_live_,
    // authenticate using ApiKeyAuthGuard.
    if (hasApiKey || (bearerToken && bearerToken.startsWith(API_KEY_PREFIX))) {
      return await this.apiKeyAuthGuard.canActivate(context);
    }

    // If an Authorization Bearer token is supplied, authenticate using JwtAuthGuard.
    if (bearerToken) {
      const allowed = await this.executeGuard(this.jwtAuthGuard, context);
      if (allowed) {
        // Normalize request.user so that principal.userId is always accessible
        const userObj = request.user as
          | { _id?: unknown; id?: unknown; userId?: string }
          | undefined;
        if (userObj && !userObj.userId) {
          const resolvedUserId = (userObj.id ?? userObj._id)?.toString();
          if (resolvedUserId) {
            userObj.userId = resolvedUserId;
          }
        }
        return true;
      }
      return false;
    }

    throw new UnauthorizedException(
      'Missing authentication credentials in Authorization Bearer or x-api-key header',
    );
  }
}
