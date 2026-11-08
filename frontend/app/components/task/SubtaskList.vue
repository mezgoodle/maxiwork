<template>
  <div class="space-y-4">
    <!-- Header with Counter, Progress, and AI Suggest Button -->
    <div class="flex items-center justify-between gap-4">
      <div class="flex items-center gap-2.5">
        <h3 class="text-xs font-bold text-slate-300 uppercase tracking-wider">
          Subtasks
        </h3>
        <span
          class="px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-800 text-slate-300 border border-slate-700/80 font-mono"
        >
          {{ completedCount }}/{{ totalCount }}
        </span>
      </div>

      <div class="flex items-center gap-3">
        <!-- Percentage Indicator -->
        <span
          v-if="totalCount > 0"
          class="text-xs font-mono font-medium text-slate-400"
        >
          {{ progressPercent }}%
        </span>

        <!-- AI Suggest Subtasks Button -->
        <button
          type="button"
          class="px-2.5 py-1 rounded-lg text-xs font-medium text-indigo-300 hover:text-white bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          :disabled="isSuggesting"
          title="Suggest subtasks using Gemini AI"
          @click="handleSuggestSubtasks"
        >
          <span v-if="isSuggesting" class="animate-spin text-[10px]">⚙️</span>
          <span v-else>✨</span>
          <span>{{ isSuggesting ? 'Thinking...' : 'Suggest with AI' }}</span>
        </button>
      </div>
    </div>

    <!-- Progress Bar -->
    <div
      v-if="totalCount > 0"
      class="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-700/40"
    >
      <div
        class="h-full transition-all duration-300 rounded-full"
        :class="progressPercent === 100 ? 'bg-emerald-500' : 'bg-indigo-500'"
        :style="{ width: `${progressPercent}%` }"
      />
    </div>

    <!-- AI Subtask Suggestions Preview Card -->
    <div
      v-if="suggestedSubtasks.length > 0"
      class="p-3.5 bg-indigo-950/20 border border-indigo-500/30 rounded-2xl space-y-3"
    >
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span>✨</span>
          <span class="text-xs font-bold text-indigo-300">
            AI Proposed Subtasks
          </span>
          <span class="text-[10px] text-slate-400">
            ({{ selectedSubtaskIndexes.length }} of {{ suggestedSubtasks.length }} selected)
          </span>
        </div>
        <button
          type="button"
          class="text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
          @click="dismissSuggestions"
        >
          Dismiss
        </button>
      </div>

      <div class="space-y-1.5 max-h-48 overflow-y-auto pr-1">
        <label
          v-for="(item, idx) in suggestedSubtasks"
          :key="idx"
          class="flex items-center justify-between gap-2.5 p-2 rounded-xl bg-slate-900/60 border border-indigo-500/20 hover:border-indigo-500/40 cursor-pointer transition text-xs"
        >
          <div class="flex items-center gap-2.5 min-w-0">
            <input
              type="checkbox"
              :checked="selectedSubtaskIndexes.includes(idx)"
              class="w-3.5 h-3.5 rounded border border-slate-600 bg-slate-800 text-indigo-500 focus:ring-0 cursor-pointer"
              @change="toggleSelectSuggestion(idx)"
            >
            <span class="truncate text-slate-200 font-medium">{{ item.title }}</span>
          </div>

          <span
            class="text-[10px] font-medium px-2 py-0.5 rounded-full border capitalize shrink-0"
            :class="getPriorityBadgeClass(item.priority)"
          >
            {{ item.priority }}
          </span>
        </label>
      </div>

      <div class="flex items-center justify-end gap-2 pt-1 border-t border-indigo-500/20">
        <button
          type="button"
          class="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white cursor-pointer"
          @click="dismissSuggestions"
        >
          Cancel
        </button>
        <button
          type="button"
          class="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          :disabled="selectedSubtaskIndexes.length === 0 || isCreatingBulk"
          @click="createSelectedSubtasks"
        >
          <span>{{ isCreatingBulk ? 'Creating...' : `Create Selected (${selectedSubtaskIndexes.length})` }}</span>
        </button>
      </div>
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
    <div v-else-if="subtasks.length > 0" class="space-y-1.5">
      <div
        v-for="subtask in subtasks"
        :key="subtask._id"
        class="group flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 transition-all text-xs"
        :class="{ 'opacity-60 bg-slate-900/30': subtask.status === 'done' }"
      >
        <!-- Left: Checkbox + Key + Title -->
        <div class="flex items-center gap-2.5 min-w-0 flex-1">
          <!-- Status Toggle Checkbox -->
          <button
            type="button"
            class="w-4 h-4 rounded border flex items-center justify-center transition-colors cursor-pointer shrink-0"
            :class="
              subtask.status === 'done'
                ? 'bg-emerald-500 border-emerald-400 text-slate-950 hover:bg-emerald-400'
                : 'bg-slate-900 border-slate-600 hover:border-slate-400 text-transparent'
            "
            :title="subtask.status === 'done' ? 'Mark incomplete' : 'Mark complete'"
            @click="toggleSubtaskStatus(subtask)"
          >
            <span class="text-[10px] font-bold leading-none">✓</span>
          </button>

          <!-- Key Badge -->
          <span
            class="font-mono text-[11px] font-semibold px-1.5 py-0.5 rounded bg-slate-900/70 text-slate-400 border border-slate-700/40 shrink-0"
          >
            {{ subtask.taskKey }}
          </span>

          <!-- Title -->
          <span
            class="truncate font-medium text-slate-200 cursor-pointer hover:text-indigo-400 transition"
            :class="{ 'line-through text-slate-400': subtask.status === 'done' }"
            @click="emit('subtask-click', subtask)"
          >
            {{ subtask.title }}
          </span>

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
            class="text-[10px] font-medium px-2 py-0.5 rounded-full border capitalize"
            :class="getPriorityBadgeClass(subtask.priority)"
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
            class="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-rose-500/10 transition cursor-pointer text-xs"
            title="Delete subtask"
            @click="promptDeleteSubtask(subtask)"
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
            class="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition"
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

    <!-- Confirm Delete Subtask Dialog -->
    <ConfirmDialog
      :is-open="isConfirmDeleteDialogOpen"
      title="Delete Subtask"
      :message="`Are you sure you want to delete subtask ${subtaskToDelete?.taskKey || subtaskToDelete?.title || ''}? This action cannot be undone.`"
      confirm-text="Delete Subtask"
      is-destructive
      :loading="isDeletingSubtask"
      @confirm="confirmDeleteSubtask"
      @cancel="isConfirmDeleteDialogOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import type { Task, TaskStatus } from '../../types/task';
import type { SuggestedSubtaskItem } from '../../types/ai';
import { useTasksStore } from '../../stores/tasks';
import { useAiStore } from '../../stores/ai';
import { useApi } from '../../composables/useApi';
import { useToast } from '../../composables/useToast';
import { extractApiErrorMessage } from '../../utils/error';
import { getPriorityBadgeClass } from '../../utils/task';
import ConfirmDialog from '../ui/ConfirmDialog.vue';

interface Props {
  parentTask: Task;
  projectId?: string;
  listId?: string;
}

interface Emits {
  (e: 'updated'): void;
  (e: 'subtask-click', subtask: Task): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const tasksStore = useTasksStore();
const aiStore = useAiStore();
const { apiFetch } = useApi();
const { showToast } = useToast();

const subtasks = ref<Task[]>([]);
const loading = ref(false);
const newTitle = ref('');
const isCreating = ref(false);

const isSuggesting = ref(false);
const isCreatingBulk = ref(false);
const suggestedSubtasks = ref<SuggestedSubtaskItem[]>([]);
const selectedSubtaskIndexes = ref<number[]>([]);

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
  if (!props.parentTask?._id) return;
  loading.value = true;
  try {
    if (props.listId) {
      const res = await apiFetch<Task[]>(
        `/lists/${props.listId}/tasks/${props.parentTask._id}/subtasks`,
      );
      subtasks.value = Array.isArray(res) ? res : [];
    } else if (props.projectId) {
      const list = await tasksStore.fetchSubtasks(
        props.projectId,
        props.parentTask._id,
      );
      subtasks.value = list;
    }
  } catch {
    subtasks.value = [];
  } finally {
    loading.value = false;
  }
}

async function handleSuggestSubtasks() {
  if (!props.parentTask?.title || isSuggesting.value) return;

  isSuggesting.value = true;
  try {
    const list = await aiStore.suggestSubtasks({
      taskId: props.parentTask._id,
      title: props.parentTask.title,
      description: props.parentTask.description,
      count: 4,
    });
    suggestedSubtasks.value = list;
    selectedSubtaskIndexes.value = list.map((_, i) => i);
    if (list.length === 0) {
      showToast('No subtasks suggested', 'info');
    }
  } catch (err: unknown) {
    showToast(extractApiErrorMessage(err, 'Failed to suggest subtasks'), 'error');
  } finally {
    isSuggesting.value = false;
  }
}

function toggleSelectSuggestion(index: number) {
  if (selectedSubtaskIndexes.value.includes(index)) {
    selectedSubtaskIndexes.value = selectedSubtaskIndexes.value.filter((i) => i !== index);
  } else {
    selectedSubtaskIndexes.value.push(index);
  }
}

function dismissSuggestions() {
  suggestedSubtasks.value = [];
  selectedSubtaskIndexes.value = [];
}

async function createSelectedSubtasks() {
  if (selectedSubtaskIndexes.value.length === 0 || isCreatingBulk.value) return;

  isCreatingBulk.value = true;
  const itemsToCreate = selectedSubtaskIndexes.value.map((i) => suggestedSubtasks.value[i]);

  let createdCount = 0;
  for (const item of itemsToCreate) {
    try {
      if (props.listId) {
        const created = await apiFetch<Task>(
          `/lists/${props.listId}/tasks/${props.parentTask._id}/subtasks`,
          {
            method: 'POST',
            body: {
              title: item.title,
              priority: item.priority,
            },
          },
        );
        subtasks.value.push(created);
        createdCount++;
      } else if (props.projectId) {
        const created = await tasksStore.createSubtask(
          props.projectId,
          props.parentTask._id,
          {
            title: item.title,
            priority: item.priority,
          },
        );
        subtasks.value.push(created);
        createdCount++;
      }
    } catch {
      // Continue with remaining
    }
  }

  isCreatingBulk.value = false;
  dismissSuggestions();

  if (createdCount > 0) {
    showToast(`Created ${createdCount} subtasks with AI`, 'success');
    emit('updated');
  }
}

async function handleCreateSubtask() {
  const trimmed = newTitle.value.trim();
  if (!trimmed || isCreating.value || !props.parentTask?._id) return;

  isCreating.value = true;
  try {
    if (props.listId) {
      const created = await apiFetch<Task>(
        `/lists/${props.listId}/tasks/${props.parentTask._id}/subtasks`,
        {
          method: 'POST',
          body: {
            title: trimmed,
            priority: 'medium',
          },
        },
      );
      subtasks.value.push(created);
      newTitle.value = '';
      showToast(`Created subtask ${created.taskKey}`, 'success');
      emit('updated');
    } else if (props.projectId) {
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
      showToast(`Created subtask ${created.taskKey}`, 'success');
      emit('updated');
    }
  } catch (err: unknown) {
    showToast(extractApiErrorMessage(err, 'Failed to create subtask'), 'error');
  } finally {
    isCreating.value = false;
  }
}

async function toggleSubtaskStatus(subtask: Task) {
  const nextStatus: TaskStatus = subtask.status === 'done' ? 'todo' : 'done';
  const prevStatus = subtask.status;
  subtask.status = nextStatus;

  try {
    if (props.listId) {
      await apiFetch(`/lists/${props.listId}/tasks/${subtask._id}`, {
        method: 'PATCH',
        body: { status: nextStatus },
      });
      emit('updated');
    } else if (props.projectId) {
      await tasksStore.updateTaskStatus(
        props.projectId,
        subtask._id,
        nextStatus,
      );
      emit('updated');
    }
  } catch (err: unknown) {
    subtask.status = prevStatus;
    showToast(extractApiErrorMessage(err, 'Failed to update subtask'), 'error');
  }
}

const isConfirmDeleteDialogOpen = ref(false);
const subtaskToDelete = ref<Task | null>(null);
const isDeletingSubtask = ref(false);

function promptDeleteSubtask(subtask: Task) {
  subtaskToDelete.value = subtask;
  isConfirmDeleteDialogOpen.value = true;
}

async function confirmDeleteSubtask() {
  if (!subtaskToDelete.value) return;
  isDeletingSubtask.value = true;
  const subtaskId = subtaskToDelete.value._id;
  try {
    if (props.listId) {
      await apiFetch(`/lists/${props.listId}/tasks/${subtaskId}`, {
        method: 'DELETE',
      });
      subtasks.value = subtasks.value.filter((s) => s._id !== subtaskId);
      showToast('Subtask deleted', 'success');
      emit('updated');
    } else if (props.projectId) {
      await tasksStore.deleteTask(props.projectId, subtaskId);
      subtasks.value = subtasks.value.filter((s) => s._id !== subtaskId);
      showToast('Subtask deleted', 'success');
      emit('updated');
    }
  } catch (err: unknown) {
    showToast(extractApiErrorMessage(err, 'Failed to delete subtask'), 'error');
  } finally {
    isDeletingSubtask.value = false;
    isConfirmDeleteDialogOpen.value = false;
    subtaskToDelete.value = null;
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
    dismissSuggestions();
    loadSubtasks();
  },
);
</script>
