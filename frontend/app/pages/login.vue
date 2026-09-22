<template>
  <div class="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
    <div class="w-full max-w-md bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur">
      <div class="text-center mb-8">
        <h1 class="text-2xl font-bold text-white tracking-tight">Sign in to MaxiWork</h1>
        <p class="text-sm text-slate-400 mt-2">
          Don't have an account yet?
          <NuxtLink to="/register" class="text-emerald-400 hover:text-emerald-300 font-medium transition">
            Sign up
          </NuxtLink>
        </p>
      </div>

      <!-- Error Alert -->
      <div
        v-if="errorMessage"
        class="mb-6 p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl text-sm flex items-start gap-2.5"
      >
        <span class="text-base leading-none">⚠️</span>
        <span>{{ errorMessage }}</span>
      </div>

      <form class="space-y-5" novalidate @submit.prevent="handleSubmit">
        <!-- Email -->
        <div>
          <label for="email" class="block text-sm font-medium text-slate-300 mb-1.5">
            Email address
          </label>
          <input
            id="email"
            v-model="form.email"
            type="email"
            autocomplete="email"
            placeholder="you@example.com"
            :disabled="loading"
            class="w-full px-4 py-2.5 bg-slate-900/90 border rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition text-sm"
            :class="errors.email ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-700'"
          >
          <p v-if="errors.email" class="mt-1 text-xs text-rose-400">
            {{ errors.email }}
          </p>
        </div>

        <!-- Password -->
        <div>
          <div class="flex items-center justify-between mb-1.5">
            <label for="password" class="block text-sm font-medium text-slate-300">
              Password
            </label>
          </div>
          <input
            id="password"
            v-model="form.password"
            type="password"
            autocomplete="current-password"
            placeholder="••••••••"
            :disabled="loading"
            class="w-full px-4 py-2.5 bg-slate-900/90 border rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition text-sm"
            :class="errors.password ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-700'"
          >
          <p v-if="errors.password" class="mt-1 text-xs text-rose-400">
            {{ errors.password }}
          </p>
        </div>

        <!-- Submit Button -->
        <button
          type="submit"
          :disabled="loading"
          class="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800/50 disabled:cursor-not-allowed text-white font-medium rounded-xl shadow-lg shadow-emerald-950 transition flex items-center justify-center gap-2 cursor-pointer mt-2"
        >
          <svg
            v-if="loading"
            class="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>{{ loading ? 'Signing in...' : 'Sign In' }}</span>
        </button>
      </form>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { reactive, ref } from 'vue';
import { useAuthStore } from '../stores/auth';

definePageMeta({
  middleware: 'guest',
});

const authStore = useAuthStore();
const route = useRoute();

const form = reactive({
  email: '',
  password: '',
});

const errors = reactive({
  email: '',
  password: '',
});

const errorMessage = ref('');
const loading = ref(false);

function validate(): boolean {
  let isValid = true;
  errors.email = '';
  errors.password = '';
  errorMessage.value = '';

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!form.email.trim()) {
    errors.email = 'Please enter your email';
    isValid = false;
  } else if (!emailRegex.test(form.email.trim())) {
    errors.email = 'Invalid email format';
    isValid = false;
  }

  if (!form.password) {
    errors.password = 'Please enter your password';
    isValid = false;
  }

  return isValid;
}

interface ApiError {
  response?: { status?: number };
  statusCode?: number;
  data?: { message?: string | string[] };
}

async function handleSubmit() {
  if (!validate()) return;

  loading.value = true;
  errorMessage.value = '';

  try {
    await authStore.login({
      email: form.email.trim(),
      password: form.password,
    });

    const redirectPath = (route.query.redirect as string) || '/dashboard';
    await navigateTo(redirectPath);
  } catch (err: unknown) {
    const apiError = err as ApiError;
    if (apiError?.response?.status === 401 || apiError?.statusCode === 401) {
      errorMessage.value = 'Invalid email or password';
    } else if (apiError?.data?.message) {
      errorMessage.value = Array.isArray(apiError.data.message)
        ? apiError.data.message.join(', ')
        : apiError.data.message;
    } else {
      errorMessage.value = 'Server connection error. Please try again later.';
    }
  } finally {
    loading.value = false;
  }
}
</script>
