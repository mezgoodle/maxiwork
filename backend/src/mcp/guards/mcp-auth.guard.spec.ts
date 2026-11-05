import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { of } from 'rxjs';
import { ApiKeyAuthGuard } from '../../api-keys/guards/api-key-auth.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { McpAuthGuard, McpAuthenticatedRequest } from './mcp-auth.guard';

describe('McpAuthGuard', () => {
  let guard: McpAuthGuard;
  let mockApiKeyAuthGuard: { canActivate: jest.Mock };
  let mockJwtAuthGuard: { canActivate: jest.Mock };

  beforeEach(() => {
    mockApiKeyAuthGuard = {
      canActivate: jest.fn(),
    };
    mockJwtAuthGuard = {
      canActivate: jest.fn(),
    };
    guard = new McpAuthGuard(
      mockApiKeyAuthGuard as unknown as ApiKeyAuthGuard,
      mockJwtAuthGuard as unknown as JwtAuthGuard,
    );
  });

  function createMockContext(
    headers: Record<string, string | undefined>,
    user?: unknown,
  ): {
    context: ExecutionContext;
    request: McpAuthenticatedRequest;
  } {
    const request = {
      headers,
      user,
    } as unknown as McpAuthenticatedRequest;

    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;

    return { context, request };
  }

  it('delegates to ApiKeyAuthGuard when Bearer token starts with mxw_live_', async () => {
    mockApiKeyAuthGuard.canActivate.mockResolvedValue(true);

    const { context } = createMockContext({
      authorization: `Bearer mxw_live_${'a'.repeat(32)}`,
    });

    const allowed = await guard.canActivate(context);
    expect(allowed).toBe(true);
    expect(mockApiKeyAuthGuard.canActivate).toHaveBeenCalledWith(context);
    expect(mockJwtAuthGuard.canActivate).not.toHaveBeenCalled();
  });

  it('delegates to ApiKeyAuthGuard when x-api-key header is present', async () => {
    mockApiKeyAuthGuard.canActivate.mockResolvedValue(true);

    const { context } = createMockContext({
      'x-api-key': `mxw_live_${'b'.repeat(32)}`,
    });

    const allowed = await guard.canActivate(context);
    expect(allowed).toBe(true);
    expect(mockApiKeyAuthGuard.canActivate).toHaveBeenCalledWith(context);
    expect(mockJwtAuthGuard.canActivate).not.toHaveBeenCalled();
  });

  it('delegates to JwtAuthGuard when Bearer token is a JWT and normalizes userId from id', async () => {
    mockJwtAuthGuard.canActivate.mockImplementation((ctx: ExecutionContext) => {
      const req = ctx.switchToHttp().getRequest<McpAuthenticatedRequest>();
      req.user = {
        id: 'jwt-user-456',
        email: 'test@example.com',
      } as unknown as {
        userId: string;
      };
      return true;
    });

    const { context, request } = createMockContext({
      authorization: 'Bearer sample-jwt-token',
    });

    const allowed = await guard.canActivate(context);
    expect(allowed).toBe(true);
    expect(mockJwtAuthGuard.canActivate).toHaveBeenCalledWith(context);
    expect(mockApiKeyAuthGuard.canActivate).not.toHaveBeenCalled();
    expect(request.user?.userId).toBe('jwt-user-456');
  });

  it('normalizes userId from _id when id is not set on user', async () => {
    mockJwtAuthGuard.canActivate.mockImplementation((ctx: ExecutionContext) => {
      const req = ctx.switchToHttp().getRequest<McpAuthenticatedRequest>();
      req.user = {
        _id: 'objectid-789',
        email: 'test@example.com',
      } as unknown as {
        userId: string;
      };
      return of(true);
    });

    const { context, request } = createMockContext({
      authorization: 'Bearer sample-jwt-token',
    });

    const allowed = await guard.canActivate(context);
    expect(allowed).toBe(true);
    expect(request.user?.userId).toBe('objectid-789');
  });

  it('throws UnauthorizedException when no auth headers are provided', async () => {
    const { context } = createMockContext({});

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(mockApiKeyAuthGuard.canActivate).not.toHaveBeenCalled();
    expect(mockJwtAuthGuard.canActivate).not.toHaveBeenCalled();
  });

  it('propagates UnauthorizedException when ApiKeyAuthGuard throws', async () => {
    mockApiKeyAuthGuard.canActivate.mockRejectedValue(
      new UnauthorizedException('Invalid API key'),
    );

    const { context } = createMockContext({
      authorization: 'Bearer mxw_live_invalid',
    });

    await expect(guard.canActivate(context)).rejects.toThrow('Invalid API key');
  });

  it('propagates UnauthorizedException when JwtAuthGuard throws', async () => {
    mockJwtAuthGuard.canActivate.mockRejectedValue(
      new UnauthorizedException('Token has expired'),
    );

    const { context } = createMockContext({
      authorization: 'Bearer expired-jwt-token',
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      'Token has expired',
    );
  });
});
