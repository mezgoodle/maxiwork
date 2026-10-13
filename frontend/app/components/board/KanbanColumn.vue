<template>
  <div
    class="flex-shrink-0 w-80 bg-slate-900/60 border border-slate-800/90 rounded-2xl flex flex-col max-h-[calc(100vh-14rem)] transition-all duration-200"
    :class="{
      'ring-2 ring-indigo-500/60 bg-slate-800/50 border-indigo-500/40': isDragOver,
    }"
    @dragover.prevent="handleDragOver"
    @dragleave="handleDragLeave"
    @drop.prevent="handleDrop"
  >
    <!-- Column Header -->
    <div class="p-4 border-b border-slate-800/80 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span
          class="w-2.5 h-2.5 rounded-full"
          :class="!color ? statusDotClass : ''"
          :style="color ? { backgroundColor: color } : {}"
        />
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
        title="Open full task modal for this status"
        @click="emit('create-task', props.status)"
      >
        +
      </button>
    </div>

    <!-- Task Cards List -->
    <div class="flex-1 overflow-y-auto p-3 space-y-3 min-h-[120px]">
      <div
        v-if="tasks.length === 0"
        class="h-28 border-2 border-dashed border-slate-800/80 rounded-xl flex items-center justify-center text-xs text-slate-500"
      >
        No tasks here
      </div>

      <TaskCard
        v-for="task in tasks"
        :key="task._id"
        :task="task"
        :project-id="projectId"
        :list-id="listId"
        :workflow="workflow"
        :users="users"
        @click="emit('task-click', task)"
        @delete="emit('delete-task', $event)"
        @toggle-done="(t) => emit('toggle-done', t)"
      />
    </div>

    <!-- Column Footer: Inline Quick Add Form -->
    <div class="p-3 border-t border-slate-800/80 bg-slate-900/40 rounded-b-2xl">
      <form
        v-if="isAddingTask"
        class="flex flex-col gap-2"
        @submit.prevent="submitInlineAdd"
      >
        <input
          ref="inlineInputRef"
          v-model="newTaskTitle"
          type="text"
          placeholder="Task title... (Enter to save)"
          class="w-full bg-slate-950/80 border border-indigo-500 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-400 font-medium"
          @keydown.enter="handleInlineEnter"
          @keydown.esc.prevent="cancelInlineAdd"
        >
        <div class="flex items-center justify-between gap-2">
          <button
            type="button"
            class="text-[11px] text-slate-400 hover:text-slate-200 transition cursor-pointer px-2 py-1 rounded"
            @click="cancelInlineAdd"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="!newTaskTitle.trim()"
            class="px-3 py-1 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Add
          </button>
        </div>
      </form>

      <button
        v-else
        type="button"
        class="w-full py-1.5 px-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800/80 transition flex items-center justify-center gap-1.5 cursor-pointer border border-dashed border-slate-800 hover:border-slate-700"
        @click="startInlineAdd"
      >
        <span>+</span>
        <span>Add Task</span>
      </button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, nextTick } from 'vue';
import type { Task, TaskStatus } from '../../types/task';
import type { StatusWorkflow } from '../../types/hierarchy';
import type { UserOption } from '../../utils/table-view';
import TaskCard from './TaskCard.vue';

interface Props {
  status: TaskStatus;
  title: string;
  tasks: Task[];
  color?: string;
  projectId?: string;
  listId?: string;
  workflow?: StatusWorkflow | null;
  users?: UserOption[];
}

interface Emits {
  (e: 'task-drop' | 'inline-create', idOrTitle: string, status: TaskStatus): void;
  (e: 'create-task', status: TaskStatus): void;
  (e: 'task-click' | 'toggle-done', task: Task): void;
  (e: 'delete-task', taskId: string): void;
}

const props = withDefaults(defineProps<Props>(), {
  color: undefined,
  projectId: undefined,
  listId: undefined,
  workflow: null,
  users: () => [],
});

const emit = defineEmits<Emits>();

const isDragOver = ref(false);
const isAddingTask = ref(false);
const newTaskTitle = ref('');
const inlineInputRef = ref<HTMLInputElement | null>(null);

function startInlineAdd() {
  isAddingTask.value = true;
  newTaskTitle.value = '';
  nextTick(() => {
    inlineInputRef.value?.focus();
  });
}

function cancelInlineAdd() {
  isAddingTask.value = false;
  newTaskTitle.value = '';
}

function handleInlineEnter(e: KeyboardEvent) {
  if (e.isComposing || e.keyCode === 229) return;
  e.preventDefault();
  submitInlineAdd();
}

function submitInlineAdd() {
  const trimmed = newTaskTitle.value.trim();
  if (!trimmed) return;
  emit('inline-create', trimmed, props.status);
  newTaskTitle.value = '';
  nextTick(() => {
    inlineInputRef.value?.focus();
  });
}

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
