<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script lang="ts" setup>
import { useAuthStore } from './stores/auth';

const authStore = useAuthStore();

// On app initialization, restore session if tokens exist
onMounted(async () => {
  await authStore.restoreSession();
});
</script>
