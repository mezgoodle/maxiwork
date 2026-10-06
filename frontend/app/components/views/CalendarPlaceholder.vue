<template>
  <div class="flex-1 flex flex-col items-center justify-center py-16 px-4 text-center border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/30 my-4">
    <div class="w-16 h-16 mb-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-3xl shadow-inner shadow-indigo-500/10">
      📅
    </div>
    <h3 class="text-xl font-bold text-white mb-2">
      Calendar View is Coming Soon
    </h3>
    <p class="text-sm text-slate-400 max-w-md mb-6 leading-relaxed">
      Visual monthly and weekly scheduling, deadline timeline tracking, and drag-and-drop task rescheduling will be available in Phase 4.
    </p>
    <div class="flex items-center gap-3">
      <button
        type="button"
        class="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer flex items-center gap-2"
        @click="$emit('switch-view', 'list')"
      >
        <span>📋</span>
        <span>Switch to List</span>
      </button>
      <button
        type="button"
        class="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition cursor-pointer flex items-center gap-2 shadow-lg shadow-indigo-600/20"
        @click="$emit('switch-view', 'board')"
      >
        <span>📊</span>
        <span>Switch to Board</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ViewType } from '../../types/view';

defineEmits<{
  (e: 'switch-view', view: ViewType): void;
}>();
</script>
