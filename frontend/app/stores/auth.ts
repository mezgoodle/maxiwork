import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { User, AuthTokens, LoginPayload, RegisterPayload } from '../types/auth';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const loading = ref(false);

  // Safe cookie accessor for Nuxt and Vitest
  const getAccessTokenCookie = () => {
    if (typeof useCookie === 'function') {
      return useCookie<string | null>('access_token', {
        maxAge: 15 * 60, // 15 minutes
        sameSite: 'lax',
      });
    }
    return ref<string | null>(null);
  };

  const getRefreshTokenCookie = () => {
    if (typeof useCookie === 'function') {
      return useCookie<string | null>('refresh_token', {
        maxAge: 7 * 24 * 60 * 60, // 7 days
        sameSite: 'lax',
      });
    }
    return ref<string | null>(null);
  };

  const accessTokenCookie = getAccessTokenCookie();
  const refreshTokenCookie = getRefreshTokenCookie();

  const accessToken = ref<string | null>(accessTokenCookie.value || null);
  const refreshToken = ref<string | null>(refreshTokenCookie.value || null);

  const isAuthenticated = computed(() => !!accessToken.value);

  const getApiBase = () => {
    if (typeof useRuntimeConfig === 'function') {
      try {
        const config = useRuntimeConfig();
        if (config?.public?.apiBase) {
          return config.public.apiBase as string;
        }
      } catch {
        // Fallback if called outside nuxt context
      }
    }
    return 'http://localhost:3000/api';
  };

  function setTokens(tokens: AuthTokens) {
    accessToken.value = tokens.access_token;
    refreshToken.value = tokens.refresh_token;

    accessTokenCookie.value = tokens.access_token;
    refreshTokenCookie.value = tokens.refresh_token;
  }

  function clearAuth() {
    user.value = null;
    accessToken.value = null;
    refreshToken.value = null;

    accessTokenCookie.value = null;
    refreshTokenCookie.value = null;
  }

  async function register(payload: RegisterPayload): Promise<User> {
    loading.value = true;
    try {
      const apiBase = getApiBase();
      const res = await $fetch<User>(`${apiBase}/auth/register`, {
        method: 'POST',
        body: payload,
      });
      return res;
    } finally {
      loading.value = false;
    }
  }

  async function login(credentials: LoginPayload): Promise<AuthTokens> {
    loading.value = true;
    try {
      const apiBase = getApiBase();
      const tokens = await $fetch<AuthTokens>(`${apiBase}/auth/login`, {
        method: 'POST',
        body: credentials,
      });
      setTokens(tokens);
      await fetchUser();
      return tokens;
    } finally {
      loading.value = false;
    }
  }

  async function fetchUser(): Promise<User | null> {
    if (!accessToken.value) {
      user.value = null;
      return null;
    }

    try {
      const apiBase = getApiBase();
      const userData = await $fetch<User>(`${apiBase}/auth/me`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken.value}`,
        },
      });
      user.value = userData;
      return userData;
    } catch {
      user.value = null;
      return null;
    }
  }

  let refreshPromise: Promise<AuthTokens | null> | null = null;

  async function refreshTokens(): Promise<AuthTokens | null> {
    const currentRefreshToken = refreshToken.value || refreshTokenCookie.value;
    if (!currentRefreshToken) {
      clearAuth();
      return null;
    }

    if (refreshPromise) {
      return refreshPromise;
    }

    refreshPromise = (async () => {
      try {
        const apiBase = getApiBase();
        const tokens = await $fetch<AuthTokens>(`${apiBase}/auth/refresh`, {
          method: 'POST',
          body: { refresh_token: currentRefreshToken },
        });
        setTokens(tokens);
        return tokens;
      } catch (err: unknown) {
        const status =
          (err as { response?: { status?: number }; statusCode?: number; status?: number })?.response?.status ||
          (err as { statusCode?: number })?.statusCode ||
          (err as { status?: number })?.status;

        // Only clear credentials if the server explicitly rejected the refresh token
        if (status === 400 || status === 401 || status === 403) {
          clearAuth();
        }
        throw err;
      } finally {
        refreshPromise = null;
      }
    })();

    return refreshPromise;
  }

  let sessionPromise: Promise<boolean> | null = null;

  async function restoreSession(): Promise<boolean> {
    if (sessionPromise) {
      return sessionPromise;
    }

    sessionPromise = (async () => {
      // Synchronize reactive state with cookies if present
      if (!accessToken.value && accessTokenCookie.value) {
        accessToken.value = accessTokenCookie.value;
      }
      if (!refreshToken.value && refreshTokenCookie.value) {
        refreshToken.value = refreshTokenCookie.value;
      }

      // If user profile is already loaded and access token is valid
      if (accessToken.value && user.value) {
        return true;
      }

      // If access token is present, validate it by fetching user profile
      if (accessToken.value) {
        const profile = await fetchUser();
        if (profile) {
          return true;
        }
      }

      // If access token was missing or expired, attempt refresh
      const currentRefreshToken = refreshToken.value || refreshTokenCookie.value;
      if (currentRefreshToken) {
        try {
          const tokens = await refreshTokens();
          if (tokens?.access_token) {
            const profile = await fetchUser();
            if (profile) {
              return true;
            }
          }
        } catch {
          // Token refresh failed or was rejected
        }
      }

      return false;
    })().finally(() => {
      sessionPromise = null;
    });

    return sessionPromise;
  }

  async function logout(): Promise<void> {
    const currentRefreshToken = refreshToken.value || refreshTokenCookie.value;
    if (currentRefreshToken) {
      try {
        const apiBase = getApiBase();
        await $fetch(`${apiBase}/auth/logout`, {
          method: 'POST',
          body: { refresh_token: currentRefreshToken },
        });
      } catch {
        // Ignore logout errors on network or invalidated token
      }
    }
    clearAuth();
  }

  return {
    user,
    accessToken,
    refreshToken,
    isAuthenticated,
    loading,
    setTokens,
    clearAuth,
    register,
    login,
    fetchUser,
    refreshTokens,
    restoreSession,
    logout,
  };
});
