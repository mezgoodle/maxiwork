<template>
  <div
    class="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
  >
    <TransitionGroup
      enter-active-class="transform ease-out duration-300 transition"
      enter-from-class="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
      enter-to-class="translate-y-0 opacity-100 sm:translate-x-0"
      leave-active-class="transition ease-in duration-100"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="pointer-events-auto flex items-center justify-between gap-3 p-4 rounded-xl shadow-lg border backdrop-blur text-sm"
        :class="{
          'bg-emerald-950/90 border-emerald-700/60 text-emerald-100':
            toast.type === 'success',
          'bg-rose-950/90 border-rose-700/60 text-rose-100':
            toast.type === 'error',
          'bg-slate-900/90 border-slate-700 text-slate-100':
            toast.type === 'info',
        }"
      >
        <div class="flex items-center gap-2">
          <span v-if="toast.type === 'success'" class="text-emerald-400 font-bold">✓</span>
          <span v-else-if="toast.type === 'error'" class="text-rose-400 font-bold">✕</span>
          <span v-else class="text-blue-400 font-bold">ℹ</span>
          <span>{{ toast.message }}</span>
        </div>
        <button
          type="button"
          class="text-slate-400 hover:text-white transition p-1 cursor-pointer"
          @click="remove(toast.id)"
        >
          ✕
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<script lang="ts" setup>
import { useToast } from '../../composables/useToast';

const { toasts, remove } = useToast();
</script>
