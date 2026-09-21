import { useAuthStore } from '../stores/auth';

export default defineNuxtRouteMiddleware(() => {
  const authStore = useAuthStore();
  const tokenCookie = useCookie('access_token');
  const refreshTokenCookie = useCookie('refresh_token');

  const hasAuth =
    authStore.isAuthenticated || !!tokenCookie.value || !!refreshTokenCookie.value;

  if (hasAuth) {
    return navigateTo('/dashboard');
  }
});
