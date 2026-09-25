<template>
  <div class="flex flex-col text-slate-100 h-full">
    <!-- Header: Navigation breadcrumbs, Key, Status, Done toggle, Fullscreen/Close -->
    <div class="flex flex-col gap-3 pb-4 border-b border-slate-800 mb-6 shrink-0">
      <!-- Top Bar: Parent link / Breadcrumbs & Action buttons -->
      <div class="flex items-center justify-between gap-3">
        <!-- Parent Task Link / History Back -->
        <div class="flex items-center gap-2 min-w-0">
          <button
            v-if="history.length > 0"
            type="button"
            class="text-xs text-indigo-400 hover:text-indigo-300 transition flex items-center gap-1 cursor-pointer font-medium"
            @click="navigateBack"
          >
            <span>&larr; Back</span>
          </button>

          <span v-if="history.length > 0" class="text-slate-600">/</span>

          <div
            v-if="parentTaskInfo"
            class="flex items-center gap-1.5 text-xs text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-lg cursor-pointer hover:bg-indigo-500/20 transition truncate max-w-sm"
            title="Click to open parent task"
            @click="navigateToParent"
          >
            <span class="text-slate-400">↳ Subtask of:</span>
            <span class="font-mono font-bold">{{ parentTaskInfo.taskKey }}</span>
            <span class="truncate">{{ parentTaskInfo.title }}</span>
          </div>
        </div>

        <!-- Right Side Actions: Full page, Delete, Close -->
        <div class="flex items-center gap-2 shrink-0 ml-auto">
          <!-- Open as full page button (only in drawer mode) -->
          <NuxtLink
            v-if="isDrawer && listId"
            :to="`/lists/${listId}/tasks/${activeTask._id}`"
            class="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer text-xs flex items-center gap-1"
            title="Open as Full Page"
            @click="$emit('close')"
          >
            <span>⛶</span>
            <span class="hidden sm:inline text-xs">Full Page</span>
          </NuxtLink>

          <!-- Delete Task Button -->
          <button
            type="button"
            class="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition cursor-pointer text-xs"
            title="Delete Task"
            @click="isDeleteDialogOpen = true"
          >
            🗑️
          </button>

          <!-- Close Button (in drawer mode) -->
          <button
            v-if="isDrawer"
            type="button"
            class="text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer text-lg leading-none"
            title="Close"
            @click="$emit('close')"
          >
            ✕
          </button>
        </div>
      </div>

      <!-- Controls row: Key + Status + Quick Done + Priority -->
      <div class="flex flex-wrap items-center gap-3">
        <span class="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
          {{ activeTask.taskKey || 'TASK' }}
        </span>

        <!-- Status selector -->
        <select
          :value="activeTask.status"
          class="px-3 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs font-medium text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 capitalize cursor-pointer"
          @change="updateField({ status: ($event.target as HTMLSelectElement).value as TaskStatus })"
        >
          <option value="todo">To Do</option>
          <option value="in_progress">In Progress</option>
          <option value="in_review">In Review</option>
          <option value="done">Done</option>
        </select>

        <!-- Quick Done toggle button -->
        <button
          type="button"
          class="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer border"
          :class="
            activeTask.status === 'done'
              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30'
              : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-emerald-400 hover:border-emerald-500/50'
          "
          :title="activeTask.status === 'done' ? 'Reopen task (To Do)' : 'Mark task as Done'"
          @click="toggleComplete"
        >
          <span class="text-sm font-bold leading-none">✓</span>
          <span>{{ activeTask.status === 'done' ? 'Done' : 'Mark Done' }}</span>
        </button>

        <!-- Priority dropdown -->
        <select
          :value="activeTask.priority"
          class="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs font-medium text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 capitalize cursor-pointer"
          @change="updateField({ priority: ($event.target as HTMLSelectElement).value as TaskPriority })"
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
      </div>
    </div>

    <!-- Scrollable Body -->
    <div class="flex-1 overflow-y-auto space-y-6 pr-1">
      <!-- Title Input -->
      <div>
        <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
          Title
        </label>
        <input
          v-model="editableTitle"
          type="text"
          class="w-full text-lg font-bold bg-slate-800/60 border border-slate-700/80 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition"
          placeholder="Task title..."
          @blur="saveTitle"
          @keydown.enter.prevent="saveTitle"
        >
      </div>

      <!-- Description -->
      <div>
        <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
          Description
        </label>
        <textarea
          v-model="editableDescription"
          rows="3"
          placeholder="Add more details to this task..."
          class="w-full text-sm bg-slate-800/60 border border-slate-700/80 rounded-xl p-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition leading-relaxed resize-y"
          @blur="saveDescription"
        />
      </div>

      <!-- Assignee & Dates Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-800/40 border border-slate-800 rounded-xl p-4">
        <!-- Assignee -->
        <div>
          <div class="flex items-center justify-between mb-1.5">
            <label class="block text-xs font-semibold text-slate-400">
              Assignee
            </label>
            <button
              v-if="currentUserId && taskAssigneeId !== currentUserId"
              type="button"
              class="text-[11px] text-indigo-400 hover:text-indigo-300 transition cursor-pointer hover:underline"
              @click="assignToMe"
            >
              ⚡ Assign to me
            </button>
          </div>
          <select
            :value="taskAssigneeId"
            class="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 cursor-pointer"
            @change="updateField({ assignee: ($event.target as HTMLSelectElement).value || null })"
          >
            <option value="">Unassigned</option>
            <option
              v-for="user in assignableUsers"
              :key="user._id"
              :value="user._id"
            >
              {{ user.name }}
            </option>
          </select>
        </div>

        <!-- Start Date -->
        <div>
          <label class="block text-xs font-semibold text-slate-400 mb-1.5">
            Start Date
          </label>
          <DatePickerMenu
            :model-value="formatDateForInput(activeTask.startDate)"
            placeholder="Start date"
            @update:model-value="(val) => updateField({ startDate: val ? new Date(val).toISOString() : null })"
          />
        </div>

        <!-- Due Date -->
        <div>
          <label class="block text-xs font-semibold text-slate-400 mb-1.5">
            Due Date
          </label>
          <DatePickerMenu
            :model-value="formatDateForInput(activeTask.dueDate)"
            placeholder="Due date"
            :min-date="formatDateForInput(activeTask.startDate)"
            @update:model-value="(val) => updateField({ dueDate: val ? new Date(val).toISOString() : null })"
          />
        </div>
      </div>

      <!-- Unified Subtasks Section (Clicking any subtask navigates to it!) -->
      <div class="pt-2">
        <SubtaskList
          :list-id="listId"
          :project-id="projectId"
          :parent-task="activeTask"
          @updated="handleSubtaskUpdated"
          @subtask-click="handleSubtaskClick"
        />
      </div>
    </div>

    <!-- Footer -->
    <div class="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
      <span>Created {{ formatCreatedDate(activeTask.createdAt) }}</span>
      <button
        v-if="isDrawer"
        type="button"
        class="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition cursor-pointer"
        @click="$emit('close')"
      >
        Close
      </button>
    </div>

    <!-- Delete Confirmation Dialog -->
    <ConfirmDialog
      :is-open="isDeleteDialogOpen"
      title="Delete Task"
      :message="`Are you sure you want to delete task ${activeTask.taskKey}? This action cannot be undone.`"
      confirm-text="Delete Task"
      is-destructive
      @confirm="handleConfirmDelete"
      @cancel="isDeleteDialogOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { Task, TaskPriority, TaskStatus, UpdateTaskPayload } from '../../types/task';
import { useApi } from '../../composables/useApi';
import { useToast } from '../../composables/useToast';
import { useAuthStore } from '../../stores/auth';
import { useHierarchyStore } from '../../stores/hierarchy';
import { useProjectsStore } from '../../stores/projects';
import { useTasksStore } from '../../stores/tasks';
import { extractApiErrorMessage } from '../../utils/error';
import DatePickerMenu from '../ui/DatePickerMenu.vue';
import ConfirmDialog from '../ui/ConfirmDialog.vue';
import SubtaskList from './SubtaskList.vue';

interface Props {
  initialTask: Task;
  listId?: string;
  projectId?: string;
  isDrawer?: boolean;
}

interface Emits {
  (e: 'close'): void;
  (e: 'updated', task: Task): void;
  (e: 'deleted', taskId: string): void;
}

const props = withDefaults(defineProps<Props>(), {
  listId: '',
  projectId: '',
  isDrawer: false,
});
const emit = defineEmits<Emits>();

const { apiFetch } = useApi();
const { showToast } = useToast();
const authStore = useAuthStore();
const hierarchyStore = useHierarchyStore();
const projectsStore = useProjectsStore();
const tasksStore = useTasksStore();

const activeTask = ref<Task>({ ...props.initialTask });
const history = ref<Task[]>([]);

const editableTitle = ref('');
const editableDescription = ref('');
const isDeleteDialogOpen = ref(false);

const currentUserId = computed(() => authStore.user?._id || '');

const parentTaskInfo = computed<{ _id: string; title: string; taskKey: string } | null>(() => {
  const p = activeTask.value.parentTaskId;
  if (!p) return null;
  if (typeof p === 'object' && p._id) {
    return {
      _id: p._id,
      title: p.title || 'Parent Task',
      taskKey: p.taskKey || 'TASK',
    };
  }
  return null;
});

const taskAssigneeId = computed(() => {
  if (!activeTask.value.assignee) return '';
  return typeof activeTask.value.assignee === 'object'
    ? activeTask.value.assignee._id
    : String(activeTask.value.assignee);
});

const assignableUsers = computed(() => {
  const users: { _id: string; name: string }[] = [];
  if (authStore.user) {
    const name =
      [authStore.user.firstName, authStore.user.lastName].filter(Boolean).join(' ') ||
      authStore.user.email;
    users.push({ _id: authStore.user._id, name: `${name} (You)` });
  }

  const ws = hierarchyStore.currentWorkspace;
  if (ws && Array.isArray(ws.members)) {
    for (const m of ws.members) {
      const u =
        typeof m.user === 'object' && m.user
          ? (m.user as { _id?: string; firstName?: string; lastName?: string; email?: string })
          : null;
      if (u && u._id && !users.some((x) => x._id === u._id)) {
        const name =
          [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email || 'Member';
        users.push({ _id: u._id, name });
      }
    }
  }

  // Project members
  const project = projectsStore.currentProject;
  if (props.projectId && project && Array.isArray(project.members)) {
    for (const m of project.members) {
      if (typeof m === 'object' && m && m._id && !users.some((u) => u._id === m._id)) {
        const name = [m.firstName, m.lastName].filter(Boolean).join(' ') || m.email;
        users.push({ _id: m._id, name });
      }
    }
  }

  return users;
});

function formatDateForInput(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
}

function formatCreatedDate(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString();
}

function syncInputs(task: Task) {
  editableTitle.value = task.title || '';
  editableDescription.value = task.description || '';
}

watch(
  () => props.initialTask,
  (newTask) => {
    if (newTask && newTask._id !== activeTask.value._id) {
      activeTask.value = { ...newTask };
      history.value = [];
      syncInputs(newTask);
    }
  },
  { immediate: true },
);

async function handleSubtaskClick(subtask: Task) {
  history.value.push(activeTask.value);
  // Fetch full details of the subtask
  if (props.listId) {
    try {
      const fullSubtask = await apiFetch<Task>(
        `/lists/${props.listId}/tasks/${subtask._id}`,
      );
      activeTask.value = fullSubtask;
    } catch {
      activeTask.value = { ...subtask };
    }
  } else {
    activeTask.value = { ...subtask };
  }
  syncInputs(activeTask.value);
}

async function navigateBack() {
  const previous = history.value.pop();
  if (previous) {
    activeTask.value = previous;
    syncInputs(previous);
  }
}

async function navigateToParent() {
  if (!parentTaskInfo.value) return;
  const parentId = parentTaskInfo.value._id;
  history.value.push(activeTask.value);
  if (props.listId) {
    try {
      const parent = await apiFetch<Task>(`/lists/${props.listId}/tasks/${parentId}`);
      activeTask.value = parent;
      syncInputs(parent);
    } catch (err: unknown) {
      showToast(extractApiErrorMessage(err, 'Failed to load parent task'), 'error');
    }
  }
}

async function updateField(payload: UpdateTaskPayload) {
  try {
    let updated: Task;
    if (props.listId) {
      updated = await apiFetch<Task>(
        `/lists/${props.listId}/tasks/${activeTask.value._id}`,
        {
          method: 'PATCH',
          body: payload,
        },
      );
    } else if (props.projectId) {
      updated = await tasksStore.updateTask(
        props.projectId,
        activeTask.value._id,
        payload,
      );
    } else {
      return;
    }
    activeTask.value = updated;
    syncInputs(updated);
    emit('updated', updated);
    showToast('Task updated', 'success');
  } catch (err: unknown) {
    showToast(extractApiErrorMessage(err, 'Failed to update task'), 'error');
  }
}

async function saveTitle() {
  const trimmed = editableTitle.value.trim();
  if (!trimmed || trimmed === activeTask.value.title) {
    if (!trimmed) {
      editableTitle.value = activeTask.value.title;
    }
    return;
  }
  await updateField({ title: trimmed });
}

async function saveDescription() {
  const trimmed = editableDescription.value.trim();
  if (trimmed === (activeTask.value.description || '').trim()) return;
  await updateField({ description: trimmed });
}

async function assignToMe() {
  if (currentUserId.value) {
    await updateField({ assignee: currentUserId.value });
  }
}

async function toggleComplete() {
  const newStatus: TaskStatus = activeTask.value.status === 'done' ? 'todo' : 'done';
  await updateField({ status: newStatus });
}

function handleSubtaskUpdated() {
  emit('updated', activeTask.value);
}

async function handleConfirmDelete() {
  try {
    if (props.listId) {
      await apiFetch(`/lists/${props.listId}/tasks/${activeTask.value._id}`, {
        method: 'DELETE',
      });
    } else if (props.projectId) {
      await tasksStore.deleteTask(props.projectId, activeTask.value._id);
    }
    showToast('Task deleted successfully', 'success');
    emit('deleted', activeTask.value._id);
    isDeleteDialogOpen.value = false;
    if (history.value.length > 0) {
      navigateBack();
    } else {
      emit('close');
    }
  } catch (err: unknown) {
    showToast(extractApiErrorMessage(err, 'Failed to delete task'), 'error');
  }
}
</script>
