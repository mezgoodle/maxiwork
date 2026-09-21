import { storeToRefs } from 'pinia';
import { useAuthStore } from '../stores/auth';

export const useAuth = () => {
  const authStore = useAuthStore();
  const { user, accessToken, refreshToken, isAuthenticated, loading } =
    storeToRefs(authStore);

  return {
    user,
    accessToken,
    refreshToken,
    isAuthenticated,
    loading,
    login: authStore.login,
    register: authStore.register,
    logout: authStore.logout,
    refreshTokens: authStore.refreshTokens,
    fetchUser: authStore.fetchUser,
    clearAuth: authStore.clearAuth,
  };
};
