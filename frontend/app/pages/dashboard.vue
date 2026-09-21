<template>
  <div class="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
    <div class="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-6 sm:p-8 backdrop-blur shadow-xl">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-700/60">
        <div>
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-2">
            Авторизовано
          </span>
          <h1 class="text-3xl font-bold text-white tracking-tight">Панель користувача</h1>
          <p class="text-sm text-slate-400 mt-1">
            Ласкаво просимо до вашого робочого простору MaxiWork
          </p>
        </div>

        <button
          class="inline-flex items-center justify-center px-4 py-2 bg-rose-600/20 text-rose-300 hover:bg-rose-600/30 border border-rose-500/30 rounded-xl text-sm font-medium transition cursor-pointer self-start sm:self-auto"
          @click="handleLogout"
        >
          Вийти з акаунту
        </button>
      </div>

      <!-- User Info Card -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <div class="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
          <h2 class="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
            Профіль користувача
          </h2>

          <dl class="space-y-3 text-sm">
            <div class="flex justify-between py-2 border-b border-slate-800">
              <dt class="text-slate-400">Ім'я:</dt>
              <dd class="text-white font-medium">{{ authStore.user?.name || 'Завантаження...' }}</dd>
            </div>
            <div class="flex justify-between py-2 border-b border-slate-800">
              <dt class="text-slate-400">Email:</dt>
              <dd class="text-white font-medium">{{ authStore.user?.email || 'Завантаження...' }}</dd>
            </div>
            <div class="flex justify-between py-2 border-b border-slate-800">
              <dt class="text-slate-400">ID:</dt>
              <dd class="text-slate-400 font-mono text-xs">{{ authStore.user?._id || '-' }}</dd>
            </div>
            <div class="flex justify-between py-2">
              <dt class="text-slate-400">Статус сесії:</dt>
              <dd class="text-emerald-400 font-medium flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"/>
                Активна
              </dd>
            </div>
          </dl>
        </div>

        <!-- Token Info / Diagnostics -->
        <div class="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
          <h2 class="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
            Безпека та токени
          </h2>

          <div class="space-y-4 text-sm">
            <p class="text-slate-400 text-xs leading-relaxed">
              Ваш сеанс захищено за допомогою короткоживучих JWT access токенів (15 хв) та безпечної ротації refresh токенів (7 днів).
            </p>

            <div class="flex gap-3">
              <button
                :disabled="isRefreshing"
                class="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-medium transition cursor-pointer"
                @click="refreshTokensManual"
              >
                {{ isRefreshing ? 'Оновлення...' : 'Оновити токени (Refresh)' }}
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
    await authStore.refreshTokens();
    refreshMessage.value = 'Токени успішно оновлено!';
    setTimeout(() => {
      refreshMessage.value = '';
    }, 3000);
  } catch {
    refreshMessage.value = 'Не вдалося оновити токени.';
  } finally {
    isRefreshing.value = false;
  }
}
</script>
