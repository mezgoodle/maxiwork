<template>
  <div class="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
    <div class="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-6 sm:p-8 backdrop-blur shadow-xl">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-700/60">
        <div>
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-2">
            Authenticated
          </span>
          <h1 class="text-3xl font-bold text-white tracking-tight">User Dashboard</h1>
          <p class="text-sm text-slate-400 mt-1">
            Welcome to your MaxiWork workspace
          </p>
        </div>

        <button
          class="inline-flex items-center justify-center px-4 py-2 bg-rose-600/20 text-rose-300 hover:bg-rose-600/30 border border-rose-500/30 rounded-xl text-sm font-medium transition cursor-pointer self-start sm:self-auto"
          @click="handleLogout"
        >
          Log out
        </button>
      </div>

      <!-- User Info Card -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <div class="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
          <h2 class="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
            User Profile
          </h2>

          <dl class="space-y-3 text-sm">
            <div class="flex justify-between py-2 border-b border-slate-800">
              <dt class="text-slate-400">First Name:</dt>
              <dd class="text-white font-medium">{{ authStore.user?.firstName || 'Loading...' }}</dd>
            </div>
            <div class="flex justify-between py-2 border-b border-slate-800">
              <dt class="text-slate-400">Last Name:</dt>
              <dd class="text-white font-medium">{{ authStore.user?.lastName || 'Loading...' }}</dd>
            </div>
            <div class="flex justify-between py-2 border-b border-slate-800">
              <dt class="text-slate-400">Email:</dt>
              <dd class="text-white font-medium">{{ authStore.user?.email || 'Loading...' }}</dd>
            </div>
            <div class="flex justify-between py-2 border-b border-slate-800">
              <dt class="text-slate-400">ID:</dt>
              <dd class="text-slate-400 font-mono text-xs">{{ authStore.user?._id || '-' }}</dd>
            </div>
            <div class="flex justify-between py-2">
              <dt class="text-slate-400">Session Status:</dt>
              <dd class="text-emerald-400 font-medium flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Active
              </dd>
            </div>
          </dl>
        </div>

        <!-- Token Info / Diagnostics -->
        <div class="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
          <h2 class="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
            Security & Tokens
          </h2>

          <div class="space-y-4 text-sm">
            <p class="text-slate-400 text-xs leading-relaxed">
              Your session is secured using short-lived JWT access tokens (15m) and secure refresh token rotation (7d).
            </p>

            <div class="flex gap-3">
              <button
                :disabled="isRefreshing"
                class="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-medium transition cursor-pointer"
                @click="refreshTokensManual"
              >
                {{ isRefreshing ? 'Refreshing...' : 'Refresh Tokens' }}
              </button>
            </div>

            <p v-if="refreshMessage" class="text-xs text-emerald-400">
              {{ refreshMessage }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import { useAuthStore } from '../stores/auth';

definePageMeta({
  middleware: 'auth',
});

const authStore = useAuthStore();
const isRefreshing = ref(false);
const refreshMessage = ref('');

async function handleLogout() {
  await authStore.logout();
  await navigateTo('/login');
}

async function refreshTokensManual() {
  isRefreshing.value = true;
  refreshMessage.value = '';
  try {
    const tokens = await authStore.refreshTokens();
    if (tokens?.access_token) {
      refreshMessage.value = 'Tokens successfully refreshed!';
      setTimeout(() => {
        refreshMessage.value = '';
      }, 3000);
    } else {
      refreshMessage.value = 'Session expired. Please log in again.';
      await navigateTo('/login');
    }
  } catch {
    if (!authStore.isAuthenticated) {
      refreshMessage.value = 'Session expired. Please log in again.';
      await navigateTo('/login');
    } else {
      refreshMessage.value = 'Failed to refresh tokens. Please try again.';
    }
  } finally {
    isRefreshing.value = false;
  }
}
</script>
