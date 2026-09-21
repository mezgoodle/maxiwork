<template>
  <div class="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
    <!-- Navbar -->
    <header class="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <NuxtLink to="/" class="flex items-center gap-2 font-bold text-xl text-emerald-400 hover:text-emerald-300 transition">
          <span class="text-2xl">⚡</span> MaxiWork
        </NuxtLink>

        <nav class="flex items-center gap-4">
          <template v-if="authStore.isAuthenticated">
            <span class="text-sm text-slate-400 hidden sm:inline">
              {{ authStore.user?.name || authStore.user?.email }}
            </span>
            <NuxtLink
              to="/dashboard"
              class="px-3 py-1.5 text-sm font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition"
            >
              Панель
            </NuxtLink>
            <button
              class="px-3 py-1.5 text-sm font-medium rounded-lg bg-rose-600/20 text-rose-300 hover:bg-rose-600/30 transition cursor-pointer"
              @click="handleLogout"
            >
              Вийти
            </button>
          </template>

          <template v-else>
            <NuxtLink
              to="/login"
              class="px-3 py-1.5 text-sm font-medium text-slate-300 hover:text-white transition"
            >
              Увійти
            </NuxtLink>
            <NuxtLink
              to="/register"
              class="px-3.5 py-1.5 text-sm font-medium rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition"
            >
              Реєстрація
            </NuxtLink>
          </template>
        </nav>
      </div>
    </header>

    <!-- Content -->
    <main class="flex-1 flex flex-col">
      <slot />
    </main>

    <!-- Footer -->
    <footer class="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
      &copy; {{ new Date().getFullYear() }} MaxiWork. Всі права захищено.
    </footer>
  </div>
</template>

<script lang="ts" setup>
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();

async function handleLogout() {
  await authStore.logout();
  await navigateTo('/login');
}
</script>
