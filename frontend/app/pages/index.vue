<template>
  <div class="flex-1 flex flex-col items-center justify-center p-6 text-center">
    <div class="max-w-2xl mx-auto space-y-6">
      <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        ✨ Платформа MaxiWork
      </div>

      <h1 class="text-4xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
        Надійна та сучасна система керування задачами
      </h1>

      <p class="text-base sm:text-lg text-slate-400 max-w-xl mx-auto">
        Безпечна автентифікація з JWT, ротацією refresh-токенів та захистом маршрутів на базі NestJS та Nuxt 4.
      </p>

      <div class="flex flex-wrap items-center justify-center gap-4 pt-4">
        <template v-if="authStore.isAuthenticated">
          <NuxtLink
            to="/dashboard"
            class="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl shadow-lg shadow-emerald-950 transition"
          >
            Перейти в Панель
          </NuxtLink>
        </template>
        <template v-else>
          <NuxtLink
            to="/register"
            class="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl shadow-lg shadow-emerald-950 transition"
          >
            Почати безкоштовно
          </NuxtLink>
          <NuxtLink
            to="/login"
            class="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium rounded-xl transition"
          >
            Увійти
          </NuxtLink>
        </template>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();
</script>
