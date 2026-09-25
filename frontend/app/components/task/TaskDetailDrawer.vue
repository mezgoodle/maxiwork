<template>
  <Teleport to="body">
    <div
      v-if="isOpen && task"
      class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <!-- Backdrop -->
      <div
        class="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
        @click="emit('close')"
      />

      <!-- Drawer / Modal Container -->
      <div
        class="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 sm:p-8 text-slate-100 z-10 max-h-[90vh] flex flex-col"
      >
        <TaskDetailView
          :initial-task="task"
          :list-id="listId"
          :project-id="projectId"
          :is-drawer="true"
          @close="emit('close')"
          @updated="(updated) => emit('updated', updated)"
          @deleted="(taskId) => emit('deleted', taskId)"
        />
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import type { Task } from '../../types/task';
import TaskDetailView from './TaskDetailView.vue';

interface Props {
  isOpen: boolean;
  listId?: string;
  projectId?: string;
  task: Task | null;
}

interface Emits {
  (e: 'close'): void;
  (e: 'updated', task: Task): void;
  (e: 'deleted', taskId: string): void;
}

defineProps<Props>();
const emit = defineEmits<Emits>();
</script>
