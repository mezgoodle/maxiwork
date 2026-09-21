<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script lang="ts" setup>
import { useAuthStore } from './stores/auth';

const authStore = useAuthStore();

// On app initialization, fetch user profile if token is present
onMounted(async () => {
  if (authStore.isAuthenticated && !authStore.user) {
    await authStore.fetchUser();
  }
});
</script>
