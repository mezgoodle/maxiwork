import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ApiKeysService } from '../api-keys.service';
import {
  ApiKeyAuthGuard,
  ApiKeyAuthenticatedRequest,
} from './api-key-auth.guard';

describe('ApiKeyAuthGuard', () => {
  let guard: ApiKeyAuthGuard;
  let mockApiKeysService: { validateRawKey: jest.Mock };

  beforeEach(() => {
    mockApiKeysService = {
      validateRawKey: jest.fn(),
    };
    guard = new ApiKeyAuthGuard(
      mockApiKeysService as unknown as ApiKeysService,
    );
  });

  function createMockContext(headers: Record<string, string | undefined>): {
    context: ExecutionContext;
    request: ApiKeyAuthenticatedRequest;
  } {
    const request = {
      headers,
    } as unknown as ApiKeyAuthenticatedRequest;

    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;

    return { context, request };
  }

  it('authenticates valid Bearer token in Authorization header', async () => {
    mockApiKeysService.validateRawKey.mockResolvedValue({
      userId: 'user-1',
      apiKeyId: 'key-1',
    });

    const { context, request } = createMockContext({
      authorization: 'Bearer mxw_live_0123456789abcdef0123456789abcdef',
    });

    const allowed = await guard.canActivate(context);
    expect(allowed).toBe(true);
    expect(mockApiKeysService.validateRawKey).toHaveBeenCalledWith(
      'mxw_live_0123456789abcdef0123456789abcdef',
    );
    expect(request.user).toEqual({ userId: 'user-1', apiKeyId: 'key-1' });
  });

  it('authenticates valid token in x-api-key header', async () => {
    mockApiKeysService.validateRawKey.mockResolvedValue({
      userId: 'user-2',
      apiKeyId: 'key-2',
    });

    const { context, request } = createMockContext({
      'x-api-key': 'mxw_live_fedcba9876543210fedcba9876543210',
    });

    const allowed = await guard.canActivate(context);
    expect(allowed).toBe(true);
    expect(request.user).toEqual({ userId: 'user-2', apiKeyId: 'key-2' });
  });

  it('throws UnauthorizedException when no API key header is provided', async () => {
    const { context } = createMockContext({});

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
