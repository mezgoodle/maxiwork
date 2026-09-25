<template>
  <div class="space-y-4">
    <!-- Header with Counter and Progress -->
    <div class="flex items-center justify-between gap-4">
      <div class="flex items-center gap-2.5">
        <h3 class="text-sm font-bold text-slate-200 tracking-wide uppercase">
          Subtasks
        </h3>
        <span
          class="px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-800 text-slate-300 border border-slate-700/80 font-mono"
        >
          {{ completedCount }}/{{ totalCount }}
        </span>
      </div>

      <!-- Percentage Indicator -->
      <span
        v-if="totalCount > 0"
        class="text-xs font-mono font-medium text-slate-400"
      >
        {{ progressPercent }}%
      </span>
    </div>

    <!-- Progress Bar -->
    <div
      v-if="totalCount > 0"
      class="w-full h-1.5 bg-slate-900/80 rounded-full overflow-hidden border border-slate-700/40"
    >
      <div
        class="h-full transition-all duration-300 rounded-full"
        :class="progressPercent === 100 ? 'bg-emerald-500' : 'bg-indigo-500'"
        :style="{ width: `${progressPercent}%` }"
      />
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="space-y-2 py-2">
      <div
        v-for="i in 2"
        :key="i"
        class="h-10 bg-slate-800/40 rounded-xl animate-pulse border border-slate-700/40"
      />
    </div>

    <!-- Subtasks List -->
    <div v-else-if="subtasks.length > 0" class="space-y-2">
      <div
        v-for="subtask in subtasks"
        :key="subtask._id"
        class="group flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-800/80 border border-slate-700/60 hover:border-slate-600 transition-all"
        :class="{ 'opacity-60 bg-slate-900/30': subtask.status === 'done' }"
      >
        <!-- Left: Checkbox + Key + Title -->
        <div class="flex items-center gap-3 min-w-0 flex-1">
          <!-- Status Toggle Checkbox -->
          <button
            type="button"
            class="w-5 h-5 rounded-md border flex items-center justify-center transition-colors cursor-pointer shrink-0"
            :class="
              subtask.status === 'done'
                ? 'bg-emerald-500 border-emerald-400 text-slate-950 hover:bg-emerald-400'
                : 'bg-slate-900 border-slate-600 hover:border-slate-400 text-transparent'
            "
            :title="subtask.status === 'done' ? 'Mark incomplete' : 'Mark complete'"
            @click="toggleSubtaskStatus(subtask)"
          >
            <span class="text-xs font-bold leading-none">✓</span>
          </button>

          <!-- Key Badge -->
          <span
            class="font-mono text-xs font-semibold px-1.5 py-0.5 rounded bg-slate-900/70 text-slate-400 border border-slate-700/40 shrink-0"
          >
            {{ subtask.taskKey }}
          </span>

          <!-- Title -->
          <NuxtLink
            :to="`/projects/${projectId}/tasks/${subtask._id}`"
            class="text-sm font-medium truncate hover:text-emerald-400 transition"
            :class="
              subtask.status === 'done'
                ? 'line-through text-slate-400'
                : 'text-slate-200'
            "
          >
            {{ subtask.title }}
          </NuxtLink>

          <!-- Nested subtasks counter pill (if this subtask has children) -->
          <span
            v-if="subtask.subtasksCount && subtask.subtasksCount > 0"
            class="text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-300 shrink-0"
            title="Nested subtasks"
          >
            ↳ {{ subtask.completedSubtasksCount || 0 }}/{{ subtask.subtasksCount }}
          </span>
        </div>

        <!-- Right: Priority + Due Date + Delete Button -->
        <div class="flex items-center gap-2 shrink-0">
          <span
            v-if="subtask.priority"
            class="text-[11px] font-medium px-2 py-0.5 rounded-full border capitalize"
            :class="getPriorityClass(subtask.priority)"
          >
            {{ subtask.priority }}
          </span>

          <span
            v-if="subtask.dueDate"
            class="text-xs font-mono text-slate-400 hidden sm:inline"
          >
            {{ formatSubtaskDueDate(subtask.dueDate) }}
          </span>

          <!-- Delete Subtask -->
          <button
            type="button"
            class="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-rose-500/10 transition cursor-pointer"
            title="Delete subtask"
            @click="deleteSubtask(subtask._id)"
          >
            ✕
          </button>
        </div>
      </div>
    </div>

    <!-- Quick Inline Add Subtask Input -->
    <div class="pt-1">
      <form
        class="flex items-center gap-2"
        @submit.prevent="handleCreateSubtask"
      >
        <div class="relative flex-1">
          <span
            class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 text-sm"
          >
            +
          </span>
          <input
            v-model="newTitle"
            type="text"
            class="w-full bg-slate-900/80 border border-slate-700 rounded-xl pl-8 pr-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition"
            placeholder="Add a subtask... (press Enter)"
            :disabled="isCreating"
          >
        </div>

        <button
          type="submit"
          class="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 transition cursor-pointer disabled:opacity-50"
          :disabled="!newTitle.trim() || isCreating"
        >
          {{ isCreating ? 'Adding...' : 'Add' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import type { Task, TaskPriority, TaskStatus } from '../../types/task';
import { useTasksStore } from '../../stores/tasks';

interface Props {
  projectId: string;
  parentTask: Task;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: 'updated'): void;
}>();

const tasksStore = useTasksStore();
const subtasks = ref<Task[]>([]);
const loading = ref(false);
const newTitle = ref('');
const isCreating = ref(false);

const totalCount = computed(() => {
  return subtasks.value.length;
});

const completedCount = computed(() => {
  return subtasks.value.filter((s) => s.status === 'done').length;
});

const progressPercent = computed(() => {
  if (totalCount.value === 0) return 0;
  return Math.round((completedCount.value / totalCount.value) * 100);
});

async function loadSubtasks() {
  if (!props.projectId || !props.parentTask?._id) return;
  loading.value = true;
  try {
    const list = await tasksStore.fetchSubtasks(
      props.projectId,
      props.parentTask._id,
    );
    subtasks.value = list;
  } catch {
    // Fail gracefully
  } finally {
    loading.value = false;
  }
}

async function handleCreateSubtask() {
  const trimmed = newTitle.value.trim();
  if (!trimmed || isCreating.value) return;

  isCreating.value = true;
  try {
    const created = await tasksStore.createSubtask(
      props.projectId,
      props.parentTask._id,
      {
        title: trimmed,
        priority: 'medium',
      },
    );
    subtasks.value.push(created);
    newTitle.value = '';
    emit('updated');
  } catch {
    // Error handled in store
  } finally {
    isCreating.value = false;
  }
}

async function toggleSubtaskStatus(subtask: Task) {
  const nextStatus: TaskStatus = subtask.status === 'done' ? 'todo' : 'done';
  const prevStatus = subtask.status;
  subtask.status = nextStatus;

  try {
    await tasksStore.updateTaskStatus(
      props.projectId,
      subtask._id,
      nextStatus,
    );
    emit('updated');
  } catch {
    subtask.status = prevStatus;
  }
}

async function deleteSubtask(subtaskId: string) {
  try {
    await tasksStore.deleteTask(props.projectId, subtaskId);
    subtasks.value = subtasks.value.filter((s) => s._id !== subtaskId);
    emit('updated');
  } catch {
    // Error handled in store
  }
}

function getPriorityClass(priority: TaskPriority): string {
  switch (priority) {
    case 'critical':
      return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    case 'high':
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    case 'medium':
      return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
    case 'low':
      return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    default:
      return 'bg-slate-700 text-slate-300 border-slate-600';
  }
}

function formatSubtaskDueDate(dueDate?: string): string {
  if (!dueDate) return '';
  const d = new Date(dueDate);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

onMounted(() => {
  loadSubtasks();
});

watch(
  () => props.parentTask._id,
  () => {
    loadSubtasks();
  },
);
</script>
