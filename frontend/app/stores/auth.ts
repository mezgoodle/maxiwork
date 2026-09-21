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

  async function refreshTokens(): Promise<AuthTokens | null> {
    const currentRefreshToken = refreshToken.value || refreshTokenCookie.value;
    if (!currentRefreshToken) {
      clearAuth();
      return null;
    }

    try {
      const apiBase = getApiBase();
      const tokens = await $fetch<AuthTokens>(`${apiBase}/auth/refresh`, {
        method: 'POST',
        body: { refresh_token: currentRefreshToken },
      });
      setTokens(tokens);
      return tokens;
    } catch (err) {
      clearAuth();
      throw err;
    }
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
    logout,
  };
});
