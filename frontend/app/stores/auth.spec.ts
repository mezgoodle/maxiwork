import { setActivePinia, createPinia } from 'pinia';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { useAuthStore } from './auth';

describe('useAuthStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.restoreAllMocks();
  });

  it('initializes with unauthenticated state', () => {
    const store = useAuthStore();
    expect(store.user).toBeNull();
    expect(store.accessToken).toBeNull();
    expect(store.refreshToken).toBeNull();
    expect(store.isAuthenticated).toBe(false);
    expect(store.loading).toBe(false);
  });

  it('setTokens sets tokens and updates isAuthenticated', () => {
    const store = useAuthStore();
    store.setTokens({
      access_token: 'acc-123',
      refresh_token: 'ref-456',
    });

    expect(store.accessToken).toBe('acc-123');
    expect(store.refreshToken).toBe('ref-456');
    expect(store.isAuthenticated).toBe(true);
  });

  it('clearAuth clears all authentication state', () => {
    const store = useAuthStore();
    store.setTokens({
      access_token: 'acc-123',
      refresh_token: 'ref-456',
    });
    store.user = {
      _id: '1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
    };

    store.clearAuth();

    expect(store.accessToken).toBeNull();
    expect(store.refreshToken).toBeNull();
    expect(store.user).toBeNull();
    expect(store.isAuthenticated).toBe(false);
  });

  it('login saves tokens and updates user state', async () => {
    const store = useAuthStore();

    const mockTokens = {
      access_token: 'new-acc',
      refresh_token: 'new-ref',
    };
    const mockUser = {
      _id: 'user-1',
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
    };

    // Mock global $fetch
    global.$fetch = vi
      .fn()
      .mockResolvedValueOnce(mockTokens) // login response
      .mockResolvedValueOnce(mockUser); // fetchUser response

    const result = await store.login({
      email: 'test@example.com',
      password: 'password123',
    });

    expect(result).toEqual(mockTokens);
    expect(store.accessToken).toBe('new-acc');
    expect(store.refreshToken).toBe('new-ref');
    expect(store.user).toEqual(mockUser);
    expect(store.isAuthenticated).toBe(true);
  });

  it('register calls register endpoint', async () => {
    const store = useAuthStore();
    const mockCreatedUser = {
      _id: 'user-2',
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
    };

    global.$fetch = vi.fn().mockResolvedValue(mockCreatedUser);

    const result = await store.register({
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      password: 'password123',
    });

    expect(result).toEqual(mockCreatedUser);
  });

  it('refreshTokens calls refresh endpoint and updates tokens', async () => {
    const store = useAuthStore();
    store.setTokens({
      access_token: 'old-acc',
      refresh_token: 'old-ref',
    });

    const rotatedTokens = {
      access_token: 'fresh-acc',
      refresh_token: 'fresh-ref',
    };
    global.$fetch = vi.fn().mockResolvedValue(rotatedTokens);

    const result = await store.refreshTokens();

    expect(result).toEqual(rotatedTokens);
    expect(store.accessToken).toBe('fresh-acc');
    expect(store.refreshToken).toBe('fresh-ref');
  });

  it('logout invalidates tokens and clears state', async () => {
    const store = useAuthStore();
    store.setTokens({
      access_token: 'acc',
      refresh_token: 'ref',
    });

    global.$fetch = vi.fn().mockResolvedValue({ message: 'Logged out' });

    await store.logout();

    expect(store.accessToken).toBeNull();
    expect(store.refreshToken).toBeNull();
    expect(store.isAuthenticated).toBe(false);
  });

  it('refreshTokens deduplicates concurrent calls into a single request', async () => {
    const store = useAuthStore();
    store.setTokens({
      access_token: 'old-acc',
      refresh_token: 'old-ref',
    });

    const rotatedTokens = {
      access_token: 'fresh-acc',
      refresh_token: 'fresh-ref',
    };
    global.$fetch = vi.fn().mockResolvedValue(rotatedTokens);

    const [res1, res2] = await Promise.all([
      store.refreshTokens(),
      store.refreshTokens(),
    ]);

    expect(global.$fetch).toHaveBeenCalledTimes(1);
    expect(res1).toEqual(rotatedTokens);
    expect(res2).toEqual(rotatedTokens);
  });

  it('refreshTokens does not clear auth on temporary server error (500)', async () => {
    const store = useAuthStore();
    store.setTokens({
      access_token: 'old-acc',
      refresh_token: 'old-ref',
    });

    global.$fetch = vi
      .fn()
      .mockRejectedValue({ statusCode: 500, message: 'Server error' });

    await expect(store.refreshTokens()).rejects.toBeDefined();
    expect(store.accessToken).toBe('old-acc');
    expect(store.refreshToken).toBe('old-ref');
  });

  it('refreshTokens clears auth when server rejects refresh token (401)', async () => {
    const store = useAuthStore();
    store.setTokens({
      access_token: 'old-acc',
      refresh_token: 'old-ref',
    });

    global.$fetch = vi
      .fn()
      .mockRejectedValue({ statusCode: 401, message: 'Unauthorized' });

    await expect(store.refreshTokens()).rejects.toBeDefined();
    expect(store.accessToken).toBeNull();
    expect(store.refreshToken).toBeNull();
  });

  it('restoreSession restores user with valid access token', async () => {
    const store = useAuthStore();
    store.setTokens({
      access_token: 'valid-acc',
      refresh_token: 'valid-ref',
    });

    const mockUser = {
      _id: 'user-1',
      firstName: 'Alex',
      lastName: 'Smith',
      email: 'alex@example.com',
    };
    global.$fetch = vi.fn().mockResolvedValue(mockUser);

    const success = await store.restoreSession();

    expect(success).toBe(true);
    expect(store.user).toEqual(mockUser);
  });

  it('restoreSession refreshes tokens if access token expired and recovers session', async () => {
    const store = useAuthStore();
    store.setTokens({
      access_token: 'expired-acc',
      refresh_token: 'valid-ref',
    });

    const mockRotated = {
      access_token: 'fresh-acc',
      refresh_token: 'fresh-ref',
    };
    const mockUser = {
      _id: 'user-1',
      firstName: 'Alex',
      lastName: 'Smith',
      email: 'alex@example.com',
    };

    global.$fetch = vi
      .fn()
      .mockRejectedValueOnce({ statusCode: 401, message: 'Expired' })
      .mockResolvedValueOnce(mockRotated)
      .mockResolvedValueOnce(mockUser);

    const success = await store.restoreSession();

    expect(success).toBe(true);
    expect(store.accessToken).toBe('fresh-acc');
    expect(store.user).toEqual(mockUser);
  });
});
