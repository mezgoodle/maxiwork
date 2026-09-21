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
      if (response.status === 401 && authStore.refreshToken) {
        try {
          // Attempt token refresh
          const newTokens = await authStore.refreshTokens();
          if (newTokens?.access_token) {
            options.headers = new Headers(options.headers);
            options.headers.set(
              'Authorization',
              `Bearer ${newTokens.access_token}`,
            );
            // Retry the request
            return await $fetch(
              response.url,
              options as NitroFetchOptions<NitroFetchRequest>,
            );
          }
        } catch {
          await authStore.logout();
          if (typeof navigateTo === 'function') {
            await navigateTo('/login');
          }
        }
      }
    },
  });

  return {
    apiFetch,
  };
};
