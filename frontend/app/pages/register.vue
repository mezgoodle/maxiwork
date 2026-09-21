<template>
  <div class="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
    <div class="w-full max-w-md bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur">
      <div class="text-center mb-8">
        <h1 class="text-2xl font-bold text-white tracking-tight">Створення акаунту</h1>
        <p class="text-sm text-slate-400 mt-2">
          Вже маєте акаунт?
          <NuxtLink to="/login" class="text-emerald-400 hover:text-emerald-300 font-medium transition">
            Увійти
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

      <form class="space-y-4" novalidate @submit.prevent="handleSubmit">
        <!-- Name -->
        <div>
          <label for="name" class="block text-sm font-medium text-slate-300 mb-1.5">
            Ваше ім'я
          </label>
          <input
            id="name"
            v-model="form.name"
            type="text"
            autocomplete="name"
            placeholder="Тарас Шевченко"
            :disabled="loading"
            class="w-full px-4 py-2.5 bg-slate-900/90 border rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition text-sm"
            :class="errors.name ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-700'"
          >
          <p v-if="errors.name" class="mt-1 text-xs text-rose-400">
            {{ errors.name }}
          </p>
        </div>

        <!-- Email -->
        <div>
          <label for="email" class="block text-sm font-medium text-slate-300 mb-1.5">
            Електронна пошта
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
          <label for="password" class="block text-sm font-medium text-slate-300 mb-1.5">
            Пароль
          </label>
          <input
            id="password"
            v-model="form.password"
            type="password"
            autocomplete="new-password"
            placeholder="Мінімум 6 символів"
            :disabled="loading"
            class="w-full px-4 py-2.5 bg-slate-900/90 border rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition text-sm"
            :class="errors.password ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-700'"
          >
          <p v-if="errors.password" class="mt-1 text-xs text-rose-400">
            {{ errors.password }}
          </p>
        </div>

        <!-- Confirm Password -->
        <div>
          <label for="confirmPassword" class="block text-sm font-medium text-slate-300 mb-1.5">
            Підтвердження пароля
          </label>
          <input
            id="confirmPassword"
            v-model="form.confirmPassword"
            type="password"
            autocomplete="new-password"
            placeholder="Повторіть пароль"
            :disabled="loading"
            class="w-full px-4 py-2.5 bg-slate-900/90 border rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition text-sm"
            :class="errors.confirmPassword ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-700'"
          >
          <p v-if="errors.confirmPassword" class="mt-1 text-xs text-rose-400">
            {{ errors.confirmPassword }}
          </p>
        </div>

        <!-- Submit Button -->
        <button
          type="submit"
          :disabled="loading"
          class="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800/50 disabled:cursor-not-allowed text-white font-medium rounded-xl shadow-lg shadow-emerald-950 transition flex items-center justify-center gap-2 cursor-pointer mt-4"
        >
          <svg
            v-if="loading"
            class="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>{{ loading ? 'Реєстрація...' : 'Зареєструватися' }}</span>
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

const form = reactive({
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
});

const errors = reactive({
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
});

const errorMessage = ref('');
const loading = ref(false);

function validate(): boolean {
  let isValid = true;
  errors.name = '';
  errors.email = '';
  errors.password = '';
  errors.confirmPassword = '';
  errorMessage.value = '';

  if (!form.name.trim()) {
    errors.name = "Введіть ваше ім'я";
    isValid = false;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!form.email.trim()) {
    errors.email = 'Введіть електронну пошту';
    isValid = false;
  } else if (!emailRegex.test(form.email.trim())) {
    errors.email = 'Некоректний формат email';
    isValid = false;
  }

  if (!form.password) {
    errors.password = 'Введіть пароль';
    isValid = false;
  } else if (form.password.length < 6) {
    errors.password = 'Пароль має містити щонайменше 6 символів';
    isValid = false;
  }

  if (form.password !== form.confirmPassword) {
    errors.confirmPassword = 'Паролі не співпадають';
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
    // 1. Register user
    await authStore.register({
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password,
    });

    // 2. Automatically log in after registration
    await authStore.login({
      email: form.email.trim(),
      password: form.password,
    });

    await navigateTo('/dashboard');
  } catch (err: unknown) {
    const apiError = err as ApiError;
    if (apiError?.response?.status === 409 || apiError?.statusCode === 409) {
      errorMessage.value =
        'Користувач із такою електронною поштою вже зареєстрований';
    } else if (apiError?.data?.message) {
      errorMessage.value = Array.isArray(apiError.data.message)
        ? apiError.data.message.join(', ')
        : apiError.data.message;
    } else {
      errorMessage.value = 'Помилка під час реєстрації. Спробуйте пізніше';
    }
  } finally {
    loading.value = false;
  }
}
</script>
