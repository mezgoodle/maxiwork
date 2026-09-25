<template>
  <Teleport to="body">
    <div
      v-if="isOpen && task"
      class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <!-- Backdrop -->
      <div
        class="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
        @click="handleClose"
      />

      <!-- Drawer / Modal Container -->
      <div
        class="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 sm:p-8 text-slate-100 z-10 max-h-[90vh] flex flex-col"
      >
        <!-- Header -->
        <div class="flex items-center justify-between pb-4 border-b border-slate-800 mb-6 shrink-0">
          <div class="flex items-center gap-3">
            <span class="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {{ task.taskKey || 'TASK' }}
            </span>

            <!-- Status dropdown -->
            <select
              :value="task.status"
              class="px-3 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs font-medium text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 capitalize"
              @change="updateField({ status: ($event.target as HTMLSelectElement).value as TaskStatus })"
            >
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="in_review">In Review</option>
              <option value="done">Done</option>
            </select>

            <!-- Priority dropdown -->
            <select
              :value="task.priority"
              class="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs font-medium text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 capitalize"
              @change="updateField({ priority: ($event.target as HTMLSelectElement).value as TaskPriority })"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          <div class="flex items-center gap-2">
            <button
              type="button"
              class="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition cursor-pointer text-xs"
              title="Delete Task"
              @click="isDeleteDialogOpen = true"
            >
              🗑️
            </button>
            <button
              type="button"
              class="text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer text-lg leading-none"
              @click="handleClose"
            >
              ✕
            </button>
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
              class="w-full text-lg font-bold bg-slate-800/60 border border-slate-700/80 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
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
              class="w-full text-sm bg-slate-800/60 border border-slate-700/80 rounded-xl p-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
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
                class="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
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
                :model-value="formatDateForInput(task.startDate)"
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
                :model-value="formatDateForInput(task.dueDate)"
                placeholder="Due date"
                :min-date="formatDateForInput(task.startDate)"
                @update:model-value="(val) => updateField({ dueDate: val ? new Date(val).toISOString() : null })"
              />
            </div>
          </div>

          <!-- Subtasks Section -->
          <div class="space-y-3 pt-2">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <h3 class="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Subtasks
                </h3>
                <span class="px-2 py-0.5 text-xs font-mono rounded-full bg-slate-800 text-slate-400 border border-slate-700/60">
                  {{ completedSubtasksCount }}/{{ subtasks.length }}
                </span>
              </div>
              <span v-if="subtasks.length > 0" class="text-xs font-mono text-slate-400">
                {{ subtasksProgressPercent }}%
              </span>
            </div>

            <!-- Progress Bar -->
            <div
              v-if="subtasks.length > 0"
              class="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-700/40"
            >
              <div
                class="h-full transition-all duration-300 rounded-full"
                :class="subtasksProgressPercent === 100 ? 'bg-emerald-500' : 'bg-indigo-500'"
                :style="{ width: `${subtasksProgressPercent}%` }"
              />
            </div>

            <!-- Subtask Items -->
            <div class="space-y-1.5">
              <div
                v-for="sub in subtasks"
                :key="sub._id"
                class="group flex items-center justify-between gap-3 p-2 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 transition text-xs"
                :class="{ 'opacity-60': sub.status === 'done' }"
              >
                <div class="flex items-center gap-2.5 min-w-0 flex-1">
                  <!-- Checkbox -->
                  <button
                    type="button"
                    class="w-4 h-4 rounded border flex items-center justify-center transition-colors cursor-pointer shrink-0"
                    :class="sub.status === 'done' ? 'bg-emerald-500 border-emerald-400 text-slate-950' : 'bg-slate-900 border-slate-600 text-transparent'"
                    @click="toggleSubtask(sub)"
                  >
                    <span class="text-[10px] font-bold">✓</span>
                  </button>

                  <span class="font-mono text-[11px] text-slate-400 shrink-0">
                    {{ sub.taskKey }}
                  </span>

                  <span
                    class="truncate font-medium text-slate-200"
                    :class="{ 'line-through text-slate-400': sub.status === 'done' }"
                  >
                    {{ sub.title }}
                  </span>
                </div>

                <button
                  type="button"
                  class="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-400 p-0.5 rounded transition cursor-pointer"
                  title="Delete subtask"
                  @click="deleteSubtask(sub._id)"
                >
                  ✕
                </button>
              </div>
            </div>

            <!-- Add Subtask Inline Form -->
            <form class="flex items-center gap-2 pt-1" @submit.prevent="createSubtask">
              <input
                v-model="newSubtaskTitle"
                type="text"
                placeholder="Add a subtask... (press Enter)"
                class="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                :disabled="isSubtaskAdding"
              >
              <button
                type="submit"
                :disabled="!newSubtaskTitle.trim() || isSubtaskAdding"
                class="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer disabled:opacity-40"
              >
                {{ isSubtaskAdding ? 'Adding...' : 'Add' }}
              </button>
            </form>
          </div>
        </div>

        <!-- Footer -->
        <div class="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <span>Created {{ formatCreatedDate(task.createdAt) }}</span>
          <button
            type="button"
            class="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition cursor-pointer"
            @click="handleClose"
          >
            Close
          </button>
        </div>
      </div>

      <!-- Delete Confirmation Dialog -->
      <ConfirmDialog
        :is-open="isDeleteDialogOpen"
        title="Delete Task"
        :message="`Are you sure you want to delete task ${task.taskKey}? This action cannot be undone.`"
        confirm-text="Delete Task"
        is-danger
        @confirm="handleConfirmDelete"
        @cancel="isDeleteDialogOpen = false"
      />
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { Task, TaskPriority, TaskStatus, UpdateTaskPayload } from '../../types/task';
import { useApi } from '../../composables/useApi';
import { useToast } from '../../composables/useToast';
import { useAuthStore } from '../../stores/auth';
import { useHierarchyStore } from '../../stores/hierarchy';
import { extractApiErrorMessage } from '../../utils/error';
import DatePickerMenu from '../ui/DatePickerMenu.vue';
import ConfirmDialog from '../ui/ConfirmDialog.vue';

interface Props {
  isOpen: boolean;
  listId: string;
  task: Task | null;
}

interface Emits {
  (e: 'close'): void;
  (e: 'updated', task: Task): void;
  (e: 'deleted', taskId: string): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const { apiFetch } = useApi();
const { showToast } = useToast();
const authStore = useAuthStore();
const hierarchyStore = useHierarchyStore();

const editableTitle = ref('');
const editableDescription = ref('');
const newSubtaskTitle = ref('');
const isSubtaskAdding = ref(false);
const subtasks = ref<Task[]>([]);
const isDeleteDialogOpen = ref(false);

const currentUserId = computed(() => authStore.user?._id || '');

const taskAssigneeId = computed(() => {
  if (!props.task?.assignee) return '';
  return typeof props.task.assignee === 'object'
    ? props.task.assignee._id
    : String(props.task.assignee);
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
      if (u && u._id && u._id !== authStore.user?._id) {
        const name =
          [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email || 'Member';
        users.push({ _id: u._id, name });
      }
    }
  }
  return users;
});

const completedSubtasksCount = computed(() => {
  return subtasks.value.filter((s) => s.status === 'done').length;
});

const subtasksProgressPercent = computed(() => {
  if (subtasks.value.length === 0) return 0;
  return Math.round((completedSubtasksCount.value / subtasks.value.length) * 100);
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

function handleClose() {
  emit('close');
}

async function loadSubtasks() {
  if (!props.listId || !props.task?._id) return;
  try {
    const res = await apiFetch<Task[]>(
      `/lists/${props.listId}/tasks/${props.task._id}/subtasks`,
      { method: 'GET' },
    );
    subtasks.value = Array.isArray(res) ? res : [];
  } catch {
    subtasks.value = [];
  }
}

watch(
  () => props.task,
  (newTask) => {
    if (newTask) {
      editableTitle.value = newTask.title || '';
      editableDescription.value = newTask.description || '';
      loadSubtasks();
    }
  },
  { immediate: true },
);

async function updateField(payload: UpdateTaskPayload) {
  if (!props.task || !props.listId) return;
  try {
    const updated = await apiFetch<Task>(
      `/lists/${props.listId}/tasks/${props.task._id}`,
      {
        method: 'PATCH',
        body: payload,
      },
    );
    emit('updated', updated);
    showToast('Task updated', 'success');
  } catch (err: unknown) {
    showToast(extractApiErrorMessage(err, 'Failed to update task'), 'error');
  }
}

async function saveTitle() {
  const trimmed = editableTitle.value.trim();
  if (!trimmed || trimmed === props.task?.title) {
    if (props.task && !trimmed) {
      editableTitle.value = props.task.title;
    }
    return;
  }
  await updateField({ title: trimmed });
}

async function saveDescription() {
  const trimmed = editableDescription.value.trim();
  if (trimmed === (props.task?.description || '').trim()) return;
  await updateField({ description: trimmed });
}

async function assignToMe() {
  if (currentUserId.value) {
    await updateField({ assignee: currentUserId.value });
  }
}

async function createSubtask() {
  const title = newSubtaskTitle.value.trim();
  if (!title || !props.task || !props.listId) return;

  isSubtaskAdding.value = true;
  try {
    const subtask = await apiFetch<Task>(
      `/lists/${props.listId}/tasks/${props.task._id}/subtasks`,
      {
        method: 'POST',
        body: { title },
      },
    );
    subtasks.value.push(subtask);
    newSubtaskTitle.value = '';
    showToast(`Created subtask ${subtask.taskKey}`, 'success');

    // Notify parent to increment subtask count
    const updatedTask = {
      ...props.task,
      subtasksCount: (props.task.subtasksCount || 0) + 1,
    };
    emit('updated', updatedTask);
  } catch (err: unknown) {
    showToast(extractApiErrorMessage(err, 'Failed to create subtask'), 'error');
  } finally {
    isSubtaskAdding.value = false;
  }
}

async function toggleSubtask(sub: Task) {
  const nextStatus: TaskStatus = sub.status === 'done' ? 'todo' : 'done';
  const prevStatus = sub.status;
  sub.status = nextStatus;

  try {
    await apiFetch(
      `/lists/${props.listId}/tasks/${sub._id}`,
      {
        method: 'PATCH',
        body: { status: nextStatus },
      },
    );

    // Update parent rollup in local state
    if (props.task) {
      const delta = nextStatus === 'done' ? 1 : -1;
      const updatedTask = {
        ...props.task,
        completedSubtasksCount: Math.max(
          0,
          (props.task.completedSubtasksCount || 0) + delta,
        ),
      };
      emit('updated', updatedTask);
    }
  } catch (err: unknown) {
    sub.status = prevStatus;
    showToast(extractApiErrorMessage(err, 'Failed to update subtask'), 'error');
  }
}

async function deleteSubtask(subtaskId: string) {
  if (!props.listId) return;
  try {
    await apiFetch(`/lists/${props.listId}/tasks/${subtaskId}`, {
      method: 'DELETE',
    });
    const deleted = subtasks.value.find((s) => s._id === subtaskId);
    subtasks.value = subtasks.value.filter((s) => s._id !== subtaskId);
    showToast('Subtask deleted', 'success');

    if (props.task) {
      const isCompleted = deleted?.status === 'done';
      const updatedTask = {
        ...props.task,
        subtasksCount: Math.max(0, (props.task.subtasksCount || 1) - 1),
        completedSubtasksCount: isCompleted
          ? Math.max(0, (props.task.completedSubtasksCount || 1) - 1)
          : props.task.completedSubtasksCount || 0,
      };
      emit('updated', updatedTask);
    }
  } catch (err: unknown) {
    showToast(extractApiErrorMessage(err, 'Failed to delete subtask'), 'error');
  }
}

async function handleConfirmDelete() {
  if (!props.task || !props.listId) return;
  try {
    await apiFetch(`/lists/${props.listId}/tasks/${props.task._id}`, {
      method: 'DELETE',
    });
    showToast('Task deleted successfully', 'success');
    emit('deleted', props.task._id);
    isDeleteDialogOpen.value = false;
    handleClose();
  } catch (err: unknown) {
    showToast(extractApiErrorMessage(err, 'Failed to delete task'), 'error');
  }
}
</script>
