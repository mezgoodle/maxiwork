import { useAuthStore } from '../stores/auth';

export default defineNuxtRouteMiddleware(async () => {
  const authStore = useAuthStore();
  const tokenCookie = useCookie('access_token');
  const refreshTokenCookie = useCookie('refresh_token');

  if (authStore.isAuthenticated || tokenCookie.value || refreshTokenCookie.value) {
    const isRestored = await authStore.restoreSession();
    if (isRestored && authStore.isAuthenticated) {
      return navigateTo('/dashboard');
    }
  }
});
