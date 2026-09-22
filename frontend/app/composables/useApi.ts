import type { NitroFetchOptions, NitroFetchRequest } from 'nitropack';
import { useAuthStore } from '../stores/auth';

export const useApi = () => {
  const config = useRuntimeConfig();
  const apiBase =
    (config.public?.apiBase as string) || 'http://localhost:3000/api';
  const authStore = useAuthStore();

  const apiFetch = $fetch.create({
    baseURL: apiBase,
    onRequest({ options }) {
      if (authStore.accessToken) {
        options.headers = new Headers(options.headers);
        options.headers.set('Authorization', `Bearer ${authStore.accessToken}`);
      }
    },
    async onResponseError({ response, options }) {
      const hasRefreshToken =
        authStore.refreshToken ||
        (typeof useCookie === 'function' && !!useCookie('refresh_token').value);

      if (response.status === 401 && hasRefreshToken) {
        try {
          // Attempt token refresh (in-flight deduplication handled in authStore)
          const newTokens = await authStore.refreshTokens();
          if (newTokens?.access_token) {
            options.headers = new Headers(options.headers);
            options.headers.set(
              'Authorization',
              `Bearer ${newTokens.access_token}`,
            );
            // Retry the request with the new access token
            return await $fetch(
              response.url,
              options as NitroFetchOptions<NitroFetchRequest>,
            );
          }
        } catch (err: unknown) {
          const status =
            (err as { response?: { status?: number }; statusCode?: number; status?: number })?.response?.status ||
            (err as { statusCode?: number })?.statusCode ||
            (err as { status?: number })?.status;

          // Only redirect to login when credentials were confirmed invalid
          if (status === 400 || status === 401 || status === 403) {
            await authStore.logout();
            if (typeof navigateTo === 'function') {
              await navigateTo('/login');
            }
          }
        }
      }
    },
  });

  return {
    apiFetch,
  };
};
