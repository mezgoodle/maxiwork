import { useAuthStore } from '../stores/auth';

export default defineNuxtRouteMiddleware(async (to) => {
  const authStore = useAuthStore();

  const isRestored = await authStore.restoreSession();

  if (!isRestored || !authStore.isAuthenticated) {
    return navigateTo({
      path: '/login',
      query: to.fullPath !== '/' ? { redirect: to.fullPath } : undefined,
    });
  }
});
