<template>
  <div
    class="flex-shrink-0 w-80 bg-slate-900/60 border border-slate-800/90 rounded-2xl flex flex-col max-h-[calc(100vh-14rem)] transition-all duration-200"
    :class="{
      'ring-2 ring-emerald-500/60 bg-slate-800/50 border-emerald-500/40': isDragOver,
    }"
    @dragover.prevent="handleDragOver"
    @dragleave="handleDragLeave"
    @drop.prevent="handleDrop"
  >
    <!-- Column Header -->
    <div class="p-4 border-b border-slate-800/80 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="w-2.5 h-2.5 rounded-full" :class="statusDotClass" />
        <h3 class="font-bold text-sm text-slate-200">
          {{ title }}
        </h3>
        <span
          class="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700/60"
        >
          {{ tasks.length }}
        </span>
      </div>

      <button
        type="button"
        class="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer text-sm font-semibold"
        title="Add task in this column"
        @click="$emit('create-task', status)"
      >
        +
      </button>
    </div>

    <!-- Task Cards List -->
    <div class="flex-1 overflow-y-auto p-3 space-y-3 min-h-[120px]">
      <div
        v-if="tasks.length === 0"
        class="h-32 border-2 border-dashed border-slate-800/80 rounded-xl flex items-center justify-center text-xs text-slate-500"
      >
        No tasks here
      </div>

      <TaskCard
        v-for="task in tasks"
        :key="task._id"
        :task="task"
        :project-id="projectId"
        @edit="$emit('edit-task', task)"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue';
import type { Task, TaskStatus } from '../../types/task';
import TaskCard from './TaskCard.vue';

interface Props {
  status: TaskStatus;
  title: string;
  tasks: Task[];
  projectId: string;
}

interface Emits {
  (e: 'task-drop', taskId: string, newStatus: TaskStatus): void;
  (e: 'create-task', status: TaskStatus): void;
  (e: 'edit-task', task: Task): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const isDragOver = ref(false);

const statusDotClass = computed(() => {
  const map: Record<TaskStatus, string> = {
    todo: 'bg-slate-400',
    in_progress: 'bg-amber-400 shadow-xs shadow-amber-500/50',
    in_review: 'bg-indigo-400 shadow-xs shadow-indigo-500/50',
    done: 'bg-emerald-400 shadow-xs shadow-emerald-500/50',
  };
  return map[props.status] || 'bg-slate-400';
});

function handleDragOver(e: DragEvent) {
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'move';
  }
  isDragOver.value = true;
}

function handleDragLeave(e: DragEvent) {
  // Only unset if leaving the column itself
  const currentTarget = e.currentTarget as HTMLElement;
  const relatedTarget = e.relatedTarget as HTMLElement;
  if (!currentTarget.contains(relatedTarget)) {
    isDragOver.value = false;
  }
}

function handleDrop(e: DragEvent) {
  isDragOver.value = false;
  const taskId = e.dataTransfer?.getData('text/plain');
  if (taskId) {
    emit('task-drop', taskId, props.status);
  }
}
</script>
