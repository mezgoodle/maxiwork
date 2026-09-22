<template>
  <div class="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
    <div class="w-full max-w-md bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur">
      <div class="text-center mb-8">
        <h1 class="text-2xl font-bold text-white tracking-tight">Create an Account</h1>
        <p class="text-sm text-slate-400 mt-2">
          Already have an account?
          <NuxtLink to="/login" class="text-emerald-400 hover:text-emerald-300 font-medium transition">
            Sign in
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
        <!-- Name fields (First Name & Last Name) -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label for="firstName" class="block text-sm font-medium text-slate-300 mb-1.5">
              First Name
            </label>
            <input
              id="firstName"
              v-model="form.firstName"
              type="text"
              autocomplete="given-name"
              placeholder="John"
              :disabled="loading"
              class="w-full px-4 py-2.5 bg-slate-900/90 border rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition text-sm"
              :class="errors.firstName ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-700'"
            >
            <p v-if="errors.firstName" class="mt-1 text-xs text-rose-400">
              {{ errors.firstName }}
            </p>
          </div>

          <div>
            <label for="lastName" class="block text-sm font-medium text-slate-300 mb-1.5">
              Last Name
            </label>
            <input
              id="lastName"
              v-model="form.lastName"
              type="text"
              autocomplete="family-name"
              placeholder="Doe"
              :disabled="loading"
              class="w-full px-4 py-2.5 bg-slate-900/90 border rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition text-sm"
              :class="errors.lastName ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-700'"
            >
            <p v-if="errors.lastName" class="mt-1 text-xs text-rose-400">
              {{ errors.lastName }}
            </p>
          </div>
        </div>

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
          <label for="password" class="block text-sm font-medium text-slate-300 mb-1.5">
            Password
          </label>
          <input
            id="password"
            v-model="form.password"
            type="password"
            autocomplete="new-password"
            placeholder="At least 8 chars (a-z, A-Z, 0-9)"
            :disabled="loading"
            class="w-full px-4 py-2.5 bg-slate-900/90 border rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition text-sm"
            :class="errors.password ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-700'"
          >
          <p v-if="errors.password" class="mt-1 text-xs text-rose-400">
            {{ errors.password }}
          </p>

          <!-- Dynamic Password Criteria Indicators -->
          <div
            v-if="form.password"
            class="mt-2.5 p-2.5 bg-slate-900/60 border border-slate-700/50 rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs"
          >
            <div
              v-for="criterion in passwordCriteria"
              :key="criterion.label"
              class="flex items-center gap-2 transition-colors duration-150"
              :class="criterion.valid ? 'text-emerald-400' : 'text-rose-400'"
            >
              <span
                class="w-2 h-2 rounded-full shrink-0 transition-colors duration-150"
                :class="criterion.valid ? 'bg-emerald-400 shadow-xs shadow-emerald-400/50' : 'bg-rose-500 shadow-xs shadow-rose-500/50'"
              />
              <span>{{ criterion.label }}</span>
            </div>
          </div>
        </div>

        <!-- Confirm Password -->
        <div>
          <label for="confirmPassword" class="block text-sm font-medium text-slate-300 mb-1.5">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            v-model="form.confirmPassword"
            type="password"
            autocomplete="new-password"
            placeholder="Re-enter your password"
            :disabled="loading"
            class="w-full px-4 py-2.5 bg-slate-900/90 border rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition text-sm"
            :class="errors.confirmPassword ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-700'"
          >
          <p v-if="errors.confirmPassword" class="mt-1 text-xs text-rose-400">
            {{ errors.confirmPassword }}
          </p>

          <!-- Dynamic Password Match Indicator -->
          <div
            v-if="form.confirmPassword"
            class="mt-2 flex items-center gap-2 text-xs transition-colors duration-150"
            :class="isPasswordMatch ? 'text-emerald-400' : 'text-rose-400'"
          >
            <span
              class="w-2 h-2 rounded-full shrink-0 transition-colors duration-150"
              :class="isPasswordMatch ? 'bg-emerald-400 shadow-xs shadow-emerald-400/50' : 'bg-rose-500 shadow-xs shadow-rose-500/50'"
            />
            <span>{{ isPasswordMatch ? 'Passwords match' : 'Passwords do not match' }}</span>
          </div>
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
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>{{ loading ? 'Creating account...' : 'Create Account' }}</span>
        </button>
      </form>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, reactive, ref } from 'vue';
import { useAuthStore } from '../stores/auth';

definePageMeta({
  middleware: 'guest',
});

const authStore = useAuthStore();

const form = reactive({
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  confirmPassword: '',
});

const errors = reactive({
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  confirmPassword: '',
});

const errorMessage = ref('');
const loading = ref(false);

const passwordCriteria = computed(() => [
  { label: 'At least 8 characters', valid: form.password.length >= 8 },
  { label: 'Lowercase letter (a-z)', valid: /[a-z]/.test(form.password) },
  { label: 'Uppercase letter (A-Z)', valid: /[A-Z]/.test(form.password) },
  { label: 'Number (0-9)', valid: /\d/.test(form.password) },
]);

const isPasswordMatch = computed(() => !!form.confirmPassword && form.password === form.confirmPassword);

function validate(): boolean {
  let isValid = true;
  errors.firstName = '';
  errors.lastName = '';
  errors.email = '';
  errors.password = '';
  errors.confirmPassword = '';
  errorMessage.value = '';

  if (!form.firstName.trim()) {
    errors.firstName = 'Please enter your first name';
    isValid = false;
  }

  if (!form.lastName.trim()) {
    errors.lastName = 'Please enter your last name';
    isValid = false;
  }

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
  } else if (form.password.length < 8) {
    errors.password = 'Password must be at least 8 characters long';
    isValid = false;
  } else if (!/[a-z]/.test(form.password)) {
    errors.password = 'Password must contain at least one lowercase letter';
    isValid = false;
  } else if (!/[A-Z]/.test(form.password)) {
    errors.password = 'Password must contain at least one uppercase letter';
    isValid = false;
  } else if (!/\d/.test(form.password)) {
    errors.password = 'Password must contain at least one number';
    isValid = false;
  }

  if (!form.confirmPassword) {
    errors.confirmPassword = 'Please confirm your password';
    isValid = false;
  } else if (form.password !== form.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
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
  let registrationCompleted = false;

  try {
    // 1. Register user
    await authStore.register({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      password: form.password,
    });
    registrationCompleted = true;

    // 2. Automatically log in after registration
    await authStore.login({
      email: form.email.trim(),
      password: form.password,
    });

    await navigateTo('/dashboard');
  } catch (err: unknown) {
    if (registrationCompleted) {
      await navigateTo({
        path: '/login',
        query: { registered: 'true' },
      });
      return;
    }

    const apiError = err as ApiError;
    if (apiError?.response?.status === 409 || apiError?.statusCode === 409) {
      errorMessage.value =
        'An account with this email already exists';
    } else if (apiError?.data?.message) {
      errorMessage.value = Array.isArray(apiError.data.message)
        ? apiError.data.message.join(', ')
        : apiError.data.message;
    } else {
      errorMessage.value = 'Registration failed. Please try again later.';
    }
  } finally {
    loading.value = false;
  }
}
</script>
