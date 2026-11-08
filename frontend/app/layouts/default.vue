<template>
  <div class="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
    <!-- Navbar -->
    <header class="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40">
      <div class="w-full px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <NuxtLink to="/" class="flex items-center gap-2 font-bold text-lg text-emerald-400 hover:text-emerald-300 transition">
            <span class="text-xl">⚡</span> MaxiWork
          </NuxtLink>
        </div>

        <nav class="flex items-center gap-3">
          <template v-if="authStore.isAuthenticated">
            <NuxtLink
              to="/dashboard"
              class="px-3 py-1 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition"
            >
              Dashboard
            </NuxtLink>
            <NuxtLink
              to="/settings/mcp"
              class="px-3 py-1 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition flex items-center gap-1.5"
            >
              <span>🔌</span>
              <span>MCP</span>
            </NuxtLink>
            <!-- AI Assistant Button -->
            <button
              type="button"
              class="px-3 py-1 text-xs font-medium rounded-lg bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 border border-indigo-500/30 transition flex items-center gap-1.5 cursor-pointer"
              title="Toggle AI Assistant (Ctrl+J)"
              @click="aiStore.toggleDrawer()"
            >
              <span>✨</span>
              <span>AI</span>
              <kbd class="hidden sm:inline text-[10px] text-indigo-400/80">Ctrl+J</kbd>
            </button>
            <span class="text-xs text-slate-400 hidden sm:inline ml-2">
              {{ authStore.user ? ([authStore.user.firstName, authStore.user.lastName].filter(Boolean).join(' ') || authStore.user.email) : '' }}
            </span>
            <button
              class="px-2.5 py-1 text-xs font-medium rounded-lg bg-rose-600/20 text-rose-300 hover:bg-rose-600/30 transition cursor-pointer ml-1"
              @click="handleLogout"
            >
              Logout
            </button>
          </template>

          <template v-else>
            <NuxtLink
              to="/login"
              class="px-3 py-1.5 text-sm font-medium text-slate-300 hover:text-white transition"
            >
              Login
            </NuxtLink>
            <NuxtLink
              to="/register"
              class="px-3.5 py-1.5 text-sm font-medium rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition"
            >
              Register
            </NuxtLink>
          </template>
        </nav>
      </div>
    </header>

    <!-- Main Workspace with Sidebar for Authenticated Users -->
    <div class="flex-1 flex overflow-hidden">
      <SidebarTree v-if="authStore.isAuthenticated" />

      <!-- Content -->
      <main class="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <slot />
      </main>
    </div>

    <!-- Footer -->
    <footer class="border-t border-slate-800 py-4 text-center text-xs text-slate-500">
      &copy; {{ new Date().getFullYear() }} MaxiWork. All rights reserved.
    </footer>

    <!-- Global Floating AI Drawer -->
    <AiDrawer v-if="authStore.isAuthenticated" />

    <!-- Global Toast Notifications -->
    <ToastContainer />
  </div>
</template>

<script lang="ts" setup>
import { useAuthStore } from '../stores/auth';
import { useAiStore } from '../stores/ai';
import SidebarTree from '../components/hierarchy/SidebarTree.vue';
import ToastContainer from '../components/ui/ToastContainer.vue';
import AiDrawer from '../components/ai/AiDrawer.vue';

const authStore = useAuthStore();
const aiStore = useAiStore();

async function handleLogout() {
  await authStore.logout();
  await navigateTo('/login');
}
</script>
